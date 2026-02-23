import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  accountStatusValidator,
  notificationPushStatusValidator,
  notificationTypeValidator,
  pushPlatformValidator,
  resolverRequestStatusValidator,
  ticketStatusValidator,
  userRoleValidator,
} from "./lib/validators";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    fullName: v.string(),
    role: userRoleValidator,
    accountStatus: accountStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_role_and_accountStatus", ["role", "accountStatus"]),

  tickets: defineTable({
    reporterUserId: v.id("users"),
    managerUserId: v.union(v.id("users"), v.null()),
    resolverUserId: v.union(v.id("users"), v.null()),
    category: v.string(),
    description: v.string(),
    location: v.string(),
    imageStorageId: v.id("_storage"),
    resolutionImageStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    status: ticketStatusValidator,
    resolutionNote: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.union(v.number(), v.null()),
    closedAt: v.union(v.number(), v.null()),
  })
    .index("by_reporterUserId_and_createdAt", ["reporterUserId", "createdAt"])
    .index("by_imageStorageId", ["imageStorageId"])
    .index("by_resolutionImageStorageId", ["resolutionImageStorageId"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_status_and_resolverUserId_and_createdAt", ["status", "resolverUserId", "createdAt"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"])
    .index("by_resolverUserId_and_updatedAt", ["resolverUserId", "updatedAt"]),

  ticket_status_history: defineTable({
    ticketId: v.id("tickets"),
    changedByUserId: v.id("users"),
    fromStatus: v.union(ticketStatusValidator, v.null()),
    toStatus: ticketStatusValidator,
    note: v.union(v.string(), v.null()),
    changedAt: v.number(),
  })
    .index("by_ticketId_and_changedAt", ["ticketId", "changedAt"])
    .index("by_changedByUserId_and_changedAt", ["changedByUserId", "changedAt"]),

  resolver_requests: defineTable({
    requesterUserId: v.id("users"),
    requesterEmail: v.string(),
    requesterName: v.string(),
    reason: v.union(v.string(), v.null()),
    status: resolverRequestStatusValidator,
    submittedAt: v.number(),
    decidedAt: v.union(v.number(), v.null()),
    decidedByUserId: v.union(v.id("users"), v.null()),
    decisionNote: v.union(v.string(), v.null()),
  })
    .index("by_requesterUserId", ["requesterUserId"])
    .index("by_status", ["status"])
    .index("by_submittedAt", ["submittedAt"]),

  notifications: defineTable({
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
  })
    .index("by_recipientUserId_and_createdAt", ["recipientUserId", "createdAt"])
    .index("by_recipientUserId_and_readAt", ["recipientUserId", "readAt"])
    .index("by_dedupeKey", ["dedupeKey"])
    .index("by_ticketId_and_createdAt", ["ticketId", "createdAt"]),

  push_tokens: defineTable({
    userId: v.id("users"),
    expoPushToken: v.string(),
    platform: pushPlatformValidator,
    enabled: v.boolean(),
    lastRegisteredAt: v.number(),
    updatedAt: v.number(),
    lastError: v.union(v.string(), v.null()),
  })
    .index("by_userId_and_enabled", ["userId", "enabled"])
    .index("by_expoPushToken", ["expoPushToken"]),
});
