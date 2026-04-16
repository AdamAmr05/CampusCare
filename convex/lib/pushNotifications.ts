import { ConvexError } from "convex/values";
import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const PUSH_INSTALLATION_ID_MAX_LENGTH = 128;
const PUSH_REGISTRATION_BATCH_LIMIT = 20;
const PUSH_DELIVERY_TARGET_PREFIX = "installation";

const pushNotifications = new PushNotifications<string>(components.pushNotifications);

type PushPlatform = "ios" | "android" | "web" | "unknown";

export function normalizePushInstallationId(installationId: string): string {
  const normalized = installationId.trim();

  if (normalized.length === 0) {
    throw new ConvexError("Push installation ID is required.");
  }

  if (normalized.length > PUSH_INSTALLATION_ID_MAX_LENGTH) {
    throw new ConvexError(
      `Push installation ID must be ${PUSH_INSTALLATION_ID_MAX_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

function buildPushDeliveryTargetId(installationId: string): string {
  return `${PUSH_DELIVERY_TARGET_PREFIX}:${installationId}`;
}

export async function registerPushInstallation(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    installationId: string;
    pushToken: string;
    platform: PushPlatform;
  },
): Promise<null> {
  const installationId = normalizePushInstallationId(args.installationId);
  const deliveryTargetId = buildPushDeliveryTargetId(installationId);
  const now = Date.now();

  await pushNotifications.recordToken(ctx, {
    userId: deliveryTargetId,
    pushToken: args.pushToken,
  });

  const existingRegistration = await ctx.db
    .query("push_registrations")
    .withIndex("by_installationId", (queryBuilder) =>
      queryBuilder.eq("installationId", installationId),
    )
    .unique();

  if (existingRegistration) {
    await ctx.db.patch(existingRegistration._id, {
      userId: args.userId,
      deliveryTargetId,
      platform: args.platform,
      updatedAt: now,
    });
    return null;
  }

  await ctx.db.insert("push_registrations", {
    userId: args.userId,
    installationId,
    deliveryTargetId,
    platform: args.platform,
    createdAt: now,
    updatedAt: now,
  });

  return null;
}

export async function removePushInstallation(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    installationId: string;
  },
): Promise<null> {
  const installationId = normalizePushInstallationId(args.installationId);
  const registration = await ctx.db
    .query("push_registrations")
    .withIndex("by_installationId", (queryBuilder) =>
      queryBuilder.eq("installationId", installationId),
    )
    .unique();

  if (!registration || registration.userId !== args.userId) {
    return null;
  }

  await pushNotifications.removeToken(ctx, {
    userId: registration.deliveryTargetId,
  });
  await ctx.db.delete(registration._id);

  return null;
}

export async function removeAllPushInstallationsForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<null> {
  while (true) {
    const registrations = await ctx.db
      .query("push_registrations")
      .withIndex("by_userId_and_updatedAt", (queryBuilder) => queryBuilder.eq("userId", userId))
      .order("desc")
      .take(PUSH_REGISTRATION_BATCH_LIMIT);

    if (registrations.length === 0) {
      return null;
    }

    await Promise.all(
      registrations.map((registration) =>
        pushNotifications.removeToken(ctx, {
          userId: registration.deliveryTargetId,
        }),
      ),
    );

    await Promise.all(registrations.map((registration) => ctx.db.delete(registration._id)));
  }
}

export async function sendPushNotificationToUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    notification: {
      title: string;
      body: string;
      data?: {
        notificationId: Id<"notifications">;
        type: string;
        ticketId: Id<"tickets"> | null;
        resolverRequestId: Id<"resolver_requests"> | null;
      };
    };
  },
): Promise<null> {
  const registrations = await ctx.db
    .query("push_registrations")
    .withIndex("by_userId_and_updatedAt", (queryBuilder) => queryBuilder.eq("userId", args.userId))
    .order("desc")
    .take(PUSH_REGISTRATION_BATCH_LIMIT);

  if (registrations.length === 0) {
    return null;
  }

  await pushNotifications.sendPushNotificationBatch(ctx, {
    notifications: registrations.map((registration) => ({
      userId: registration.deliveryTargetId,
      notification: {
        title: args.notification.title,
        body: args.notification.body,
        data: args.notification.data,
        sound: "default",
      },
    })),
    allowUnregisteredTokens: true,
  });

  return null;
}
