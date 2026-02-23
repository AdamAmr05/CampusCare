import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { isExpoPushEnabled } from "./env";

const NOTIFICATION_TITLE_MAX_LENGTH = 120;
const NOTIFICATION_BODY_MAX_LENGTH = 280;
const NOTIFICATION_DEDUPE_KEY_MAX_LENGTH = 220;

export type NotificationType =
  | "ticket_created"
  | "ticket_assigned"
  | "ticket_in_progress"
  | "ticket_resolved"
  | "ticket_closed"
  | "resolver_request_submitted"
  | "resolver_request_approved"
  | "resolver_request_rejected";

function normalizeRequiredText(
  value: string,
  fieldName: string,
  maxLength: number,
): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ConvexError(`${fieldName} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new ConvexError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
  fieldName: string,
  maxLength: number,
): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new ConvexError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

export function truncateNotificationText(value: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

export async function listActiveManagerUserIds(
  ctx: MutationCtx,
): Promise<Array<Id<"users">>> {
  const managers = await ctx.db
    .query("users")
    .withIndex("by_role_and_accountStatus", (queryBuilder) =>
      queryBuilder.eq("role", "manager").eq("accountStatus", "active"),
    )
    .take(200);

  return managers.map((manager) => manager._id);
}

export async function createNotificationForUser(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<"users">;
    actorUserId: Id<"users"> | null;
    type: NotificationType;
    title: string;
    body: string;
    ticketId: Id<"tickets"> | null;
    resolverRequestId: Id<"resolver_requests"> | null;
    dedupeKey: string | null;
  },
): Promise<Id<"notifications">> {
  const title = normalizeRequiredText(
    args.title,
    "Notification title",
    NOTIFICATION_TITLE_MAX_LENGTH,
  );
  const body = normalizeRequiredText(
    args.body,
    "Notification body",
    NOTIFICATION_BODY_MAX_LENGTH,
  );
  const dedupeKey = normalizeOptionalText(
    args.dedupeKey,
    "Notification dedupe key",
    NOTIFICATION_DEDUPE_KEY_MAX_LENGTH,
  );

  if (dedupeKey) {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_dedupeKey", (queryBuilder) => queryBuilder.eq("dedupeKey", dedupeKey))
      .take(1);

    if (existing.length > 0) {
      return existing[0]!._id;
    }
  }

  const shouldAttemptPush = isExpoPushEnabled();
  const notificationId = await ctx.db.insert("notifications", {
    recipientUserId: args.recipientUserId,
    actorUserId: args.actorUserId,
    type: args.type,
    title,
    body,
    ticketId: args.ticketId,
    resolverRequestId: args.resolverRequestId,
    dedupeKey,
    createdAt: Date.now(),
    readAt: null,
    pushStatus: shouldAttemptPush ? "pending" : "skipped",
    pushLastAttemptAt: null,
    pushLastError: null,
  });

  if (shouldAttemptPush) {
    await ctx.scheduler.runAfter(0, internal.notifications.deliverPush, {
      notificationId,
    });
  }

  return notificationId;
}
