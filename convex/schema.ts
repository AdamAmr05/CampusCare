import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  accountStatusValidator,
  resolverRequestStatusValidator,
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
    .index("by_email", ["email"]),

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
});
