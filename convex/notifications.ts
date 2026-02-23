import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  getExpoPushAccessTokenOrNull,
  isExpoPushEnabled,
} from "./lib/env";
import { createNotificationForUser } from "./lib/notifications";
import {
  notificationPushStatusValidator,
  notificationTypeValidator,
  pushPlatformValidator,
} from "./lib/validators";
import { requireActiveUser, requireCurrentUser } from "./lib/auth";

const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;

const notificationDocValidator = v.object({
  _id: v.id("notifications"),
  _creationTime: v.number(),
  recipientUserId: v.id("users"),
  actorUserId: v.union(v.id("users"), v.null()),
  type: notificationTypeValidator,
  title: v.string(),
  body: v.string(),
  ticketId: v.union(v.id("tickets"), v.null()),
  resolverRequestId: v.union(v.id("resolver_requests"), v.null()),
  dedupeKey: v.union(v.string(), v.null()),
  createdAt: v.number(),
  readAt: v.union(v.number(), v.null()),
  pushStatus: notificationPushStatusValidator,
  pushLastAttemptAt: v.union(v.number(), v.null()),
  pushLastError: v.union(v.string(), v.null()),
});

const pushDeliveryPayloadValidator = v.object({
  notificationId: v.id("notifications"),
  type: notificationTypeValidator,
  title: v.string(),
  body: v.string(),
  ticketId: v.union(v.id("tickets"), v.null()),
  resolverRequestId: v.union(v.id("resolver_requests"), v.null()),
  expoPushTokens: v.array(v.string()),
});

function normalizeExpoPushToken(token: string): string {
  const normalized = token.trim();
  if (normalized.length === 0) {
    throw new ConvexError("Expo push token is required.");
  }

  const isExpoToken =
    /^ExpoPushToken\[.+\]$/.test(normalized) ||
    /^ExponentPushToken\[.+\]$/.test(normalized);

  if (!isExpoToken) {
    throw new ConvexError("Invalid Expo push token format.");
  }

  return normalized;
}

function chunkArray<T>(values: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

type ExpoPushTicket = {
  status?: "ok" | "error";
  message?: string;
  details?: { error?: string };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket | ExpoPushTicket[];
  errors?: Array<{ message?: string }>;
};

export const listMine = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(notificationDocValidator),
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);

    return await ctx.db
      .query("notifications")
      .withIndex("by_recipientUserId_and_createdAt", (queryBuilder) =>
        queryBuilder.eq("recipientUserId", user._id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getUnreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipientUserId_and_readAt", (queryBuilder) =>
        queryBuilder.eq("recipientUserId", user._id).eq("readAt", null),
      )
      .take(500);

    return unreadNotifications.length;
  },
});

export const markRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.recipientUserId !== user._id) {
      throw new ConvexError("Notification not found.");
    }

    if (notification.readAt !== null) {
      return null;
    }

    await ctx.db.patch(notification._id, {
      readAt: Date.now(),
    });
    return null;
  },
});

export const markAllRead = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipientUserId_and_readAt", (queryBuilder) =>
        queryBuilder.eq("recipientUserId", user._id).eq("readAt", null),
      )
      .take(500);

    if (unreadNotifications.length === 0) {
      return 0;
    }

    const now = Date.now();
    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, {
          readAt: now,
        }),
      ),
    );

    return unreadNotifications.length;
  },
});

export const sendTestToMe = mutation({
  args: {},
  returns: v.object({
    notificationId: v.id("notifications"),
  }),
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);
    const now = Date.now();

    const notificationId = await createNotificationForUser(ctx, {
      recipientUserId: user._id,
      actorUserId: user._id,
      type: "ticket_in_progress",
      title: "Notification test",
      body: "CampusCare notification test from your current session.",
      ticketId: null,
      resolverRequestId: null,
      dedupeKey: `notification_test:${user._id}:${now}`,
    });

    return { notificationId };
  },
});

export const registerPushToken = mutation({
  args: {
    expoPushToken: v.string(),
    platform: pushPlatformValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const expoPushToken = normalizeExpoPushToken(args.expoPushToken);
    const now = Date.now();

    const existingRows = await ctx.db
      .query("push_tokens")
      .withIndex("by_expoPushToken", (queryBuilder) =>
        queryBuilder.eq("expoPushToken", expoPushToken),
      )
      .take(5);

    if (existingRows.length === 0) {
      await ctx.db.insert("push_tokens", {
        userId: user._id,
        expoPushToken,
        platform: args.platform,
        enabled: true,
        lastRegisteredAt: now,
        updatedAt: now,
        lastError: null,
      });
      return null;
    }

    await Promise.all(
      existingRows.map((row) =>
        ctx.db.patch(row._id, {
          userId: user._id,
          platform: args.platform,
          enabled: true,
          lastRegisteredAt: now,
          updatedAt: now,
          lastError: null,
        }),
      ),
    );

    return null;
  },
});

export const disablePushToken = mutation({
  args: {
    expoPushToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    if (typeof args.expoPushToken === "string") {
      const expoPushToken = normalizeExpoPushToken(args.expoPushToken);
      const matchingRows = await ctx.db
        .query("push_tokens")
        .withIndex("by_expoPushToken", (queryBuilder) =>
          queryBuilder.eq("expoPushToken", expoPushToken),
        )
        .take(5);

      await Promise.all(
        matchingRows
          .filter((row) => row.userId === user._id)
          .map((row) =>
            ctx.db.patch(row._id, {
              enabled: false,
              updatedAt: now,
            }),
          ),
      );

      return null;
    }

    const activeRows = await ctx.db
      .query("push_tokens")
      .withIndex("by_userId_and_enabled", (queryBuilder) =>
        queryBuilder.eq("userId", user._id).eq("enabled", true),
      )
      .take(20);

    await Promise.all(
      activeRows.map((row) =>
        ctx.db.patch(row._id, {
          enabled: false,
          updatedAt: now,
        }),
      ),
    );

    return null;
  },
});

export const getPushDeliveryPayload = internalQuery({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.union(pushDeliveryPayloadValidator, v.null()),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      return null;
    }

    if (notification.pushStatus !== "pending") {
      return null;
    }

    const pushTokenRows = await ctx.db
      .query("push_tokens")
      .withIndex("by_userId_and_enabled", (queryBuilder) =>
        queryBuilder.eq("userId", notification.recipientUserId).eq("enabled", true),
      )
      .take(20);

    const seenTokens = new Set<string>();
    const expoPushTokens: string[] = [];

    for (const row of pushTokenRows) {
      if (seenTokens.has(row.expoPushToken)) {
        continue;
      }
      seenTokens.add(row.expoPushToken);
      expoPushTokens.push(row.expoPushToken);
    }

    return {
      notificationId: notification._id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      ticketId: notification.ticketId,
      resolverRequestId: notification.resolverRequestId,
      expoPushTokens,
    };
  },
});

export const applyPushDeliveryResult = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    status: notificationPushStatusValidator,
    errorMessage: v.union(v.string(), v.null()),
    invalidExpoPushTokens: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      return null;
    }

    await ctx.db.patch(notification._id, {
      pushStatus: args.status,
      pushLastAttemptAt: Date.now(),
      pushLastError: args.errorMessage,
    });

    if (args.invalidExpoPushTokens.length === 0) {
      return null;
    }

    const seenTokens = new Set<string>();
    for (const token of args.invalidExpoPushTokens) {
      if (seenTokens.has(token)) {
        continue;
      }
      seenTokens.add(token);

      const pushTokenRows = await ctx.db
        .query("push_tokens")
        .withIndex("by_expoPushToken", (queryBuilder) =>
          queryBuilder.eq("expoPushToken", token),
        )
        .take(5);

      await Promise.all(
        pushTokenRows.map((row) =>
          ctx.db.patch(row._id, {
            enabled: false,
            updatedAt: Date.now(),
            lastError: "DeviceNotRegistered",
          }),
        ),
      );
    }

    return null;
  },
});

export const deliverPush = internalAction({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!isExpoPushEnabled()) {
      await ctx.runMutation(internal.notifications.applyPushDeliveryResult, {
        notificationId: args.notificationId,
        status: "skipped",
        errorMessage: "EXPO_PUSH_ENABLED is false.",
        invalidExpoPushTokens: [],
      });
      return null;
    }

    const payload = await ctx.runQuery(internal.notifications.getPushDeliveryPayload, {
      notificationId: args.notificationId,
    });

    if (!payload) {
      return null;
    }

    if (payload.expoPushTokens.length === 0) {
      await ctx.runMutation(internal.notifications.applyPushDeliveryResult, {
        notificationId: args.notificationId,
        status: "skipped",
        errorMessage: "No active push tokens for recipient.",
        invalidExpoPushTokens: [],
      });
      return null;
    }

    const messages = payload.expoPushTokens.map((token) => ({
      to: token,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: {
        notificationId: payload.notificationId,
        type: payload.type,
        ticketId: payload.ticketId,
        resolverRequestId: payload.resolverRequestId,
      },
    }));

    const chunks = chunkArray(messages, EXPO_PUSH_CHUNK_SIZE);
    const accessToken = getExpoPushAccessTokenOrNull();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const invalidTokenSet = new Set<string>();
    const errors: string[] = [];
    let successCount = 0;

    for (const chunk of chunks) {
      let response: Response;
      try {
        response = await fetch(EXPO_PUSH_SEND_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(chunk),
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Push request failed.");
        continue;
      }

      const rawBody = await response.text();
      let parsed: ExpoPushResponse | null = null;
      if (rawBody.length > 0) {
        try {
          parsed = JSON.parse(rawBody) as ExpoPushResponse;
        } catch {
          parsed = null;
        }
      }

      if (!response.ok) {
        errors.push(`Expo push request failed (${response.status}).`);
        continue;
      }

      if (Array.isArray(parsed?.errors)) {
        for (const errorItem of parsed.errors) {
          if (typeof errorItem.message === "string" && errorItem.message.length > 0) {
            errors.push(errorItem.message);
          }
        }
      }

      const data = parsed?.data;
      const tickets = Array.isArray(data) ? data : data ? [data] : [];
      tickets.forEach((ticket, index) => {
        if (ticket.status === "ok") {
          successCount += 1;
          return;
        }

        const token = chunk[index]?.to;
        if (ticket.details?.error === "DeviceNotRegistered" && token) {
          invalidTokenSet.add(token);
        }
        if (typeof ticket.message === "string" && ticket.message.length > 0) {
          errors.push(ticket.message);
        } else {
          errors.push("Unknown Expo push delivery error.");
        }
      });
    }

    const status = successCount > 0 ? "sent" : "failed";
    const errorMessage = errors.length > 0 ? errors.join(" | ").slice(0, 500) : null;

    await ctx.runMutation(internal.notifications.applyPushDeliveryResult, {
      notificationId: args.notificationId,
      status,
      errorMessage,
      invalidExpoPushTokens: Array.from(invalidTokenSet),
    });

    return null;
  },
});
