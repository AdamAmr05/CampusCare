import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { createNotificationForUser } from "./lib/notifications";
import {
  registerPushInstallation,
  removeAllPushInstallationsForUser,
  removePushInstallation,
} from "./lib/pushNotifications";
import {
  notificationTypeValidator,
  pushPlatformValidator,
} from "./lib/validators";
import { requireActiveUser, requireCurrentUser } from "./lib/auth";

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
    installationId: v.string(),
    expoPushToken: v.string(),
    platform: pushPlatformValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const expoPushToken = normalizeExpoPushToken(args.expoPushToken);
    return await registerPushInstallation(ctx, {
      userId: user._id,
      installationId: args.installationId,
      pushToken: expoPushToken,
      platform: args.platform,
    });
  },
});

export const disablePushToken = mutation({
  args: {
    installationId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (typeof args.installationId === "string") {
      return await removePushInstallation(ctx, {
        userId: user._id,
        installationId: args.installationId,
      });
    }

    return await removeAllPushInstallationsForUser(ctx, user._id);
  },
});
