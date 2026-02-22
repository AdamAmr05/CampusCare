import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  getDisplayName,
  requireCurrentUser,
  requireIdentity,
  requireRole,
  requireVerifiedGiuEmail,
} from "./lib/auth";
import { resolverRequestStatusValidator } from "./lib/validators";

type ReaderCtx = QueryCtx | MutationCtx;

const resolverRequestDocValidator = v.object({
  _id: v.id("resolver_requests"),
  _creationTime: v.number(),
  requesterUserId: v.id("users"),
  requesterEmail: v.string(),
  requesterName: v.string(),
  reason: v.union(v.string(), v.null()),
  status: resolverRequestStatusValidator,
  submittedAt: v.number(),
  decidedAt: v.union(v.number(), v.null()),
  decidedByUserId: v.union(v.id("users"), v.null()),
  decisionNote: v.union(v.string(), v.null()),
});

const createResponseValidator = v.object({
  requestId: v.id("resolver_requests"),
  status: resolverRequestStatusValidator,
  wasCreated: v.boolean(),
});

async function getLatestResolverRequestForUser(
  ctx: ReaderCtx,
  requesterUserId: Id<"users">,
) {
  const requests = await ctx.db
    .query("resolver_requests")
    .withIndex("by_requesterUserId", (queryBuilder) =>
      queryBuilder.eq("requesterUserId", requesterUserId),
    )
    .order("desc")
    .take(1);

  return requests[0] ?? null;
}

function normalizeOptionalReason(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export const create = mutation({
  args: {
    reason: v.optional(v.string()),
  },
  returns: createResponseValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const email = requireVerifiedGiuEmail(identity);
    const user = await requireCurrentUser(ctx);

    if (user.role === "manager") {
      throw new ConvexError("Managers cannot submit resolver requests.");
    }

    if (user.role === "resolver" && user.accountStatus === "active") {
      throw new ConvexError("User is already an active resolver.");
    }

    const latestRequest = await getLatestResolverRequestForUser(ctx, user._id);
    if (latestRequest?.status === "pending") {
      return {
        requestId: latestRequest._id,
        status: "pending" as const,
        wasCreated: false,
      };
    }

    const requestId = await ctx.db.insert("resolver_requests", {
      requesterUserId: user._id,
      requesterEmail: email,
      requesterName: getDisplayName(identity, email),
      reason: normalizeOptionalReason(args.reason),
      status: "pending",
      submittedAt: Date.now(),
      decidedAt: null,
      decidedByUserId: null,
      decisionNote: null,
    });

    await ctx.db.patch(user._id, {
      role: "reporter",
      accountStatus: "pending_resolver_approval",
      updatedAt: Date.now(),
    });

    return {
      requestId,
      status: "pending" as const,
      wasCreated: true,
    };
  },
});

export const getMineLatest = query({
  args: {},
  returns: v.union(resolverRequestDocValidator, v.null()),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    requireVerifiedGiuEmail(identity);
    const user = await requireCurrentUser(ctx);

    return await getLatestResolverRequestForUser(ctx, user._id);
  },
});

export const reapply = mutation({
  args: {
    reason: v.optional(v.string()),
  },
  returns: createResponseValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const email = requireVerifiedGiuEmail(identity);
    const user = await requireCurrentUser(ctx);

    if (user.role === "manager") {
      throw new ConvexError("Managers cannot reapply for resolver access.");
    }

    if (user.role === "resolver" && user.accountStatus === "active") {
      throw new ConvexError("User is already an active resolver.");
    }

    const latestRequest = await getLatestResolverRequestForUser(ctx, user._id);
    if (!latestRequest || latestRequest.status !== "rejected") {
      throw new ConvexError("Only rejected resolver requests can be reapplied.");
    }

    const requestId = await ctx.db.insert("resolver_requests", {
      requesterUserId: user._id,
      requesterEmail: email,
      requesterName: getDisplayName(identity, email),
      reason: normalizeOptionalReason(args.reason),
      status: "pending",
      submittedAt: Date.now(),
      decidedAt: null,
      decidedByUserId: null,
      decisionNote: null,
    });

    await ctx.db.patch(user._id, {
      role: "reporter",
      accountStatus: "pending_resolver_approval",
      updatedAt: Date.now(),
    });

    return {
      requestId,
      status: "pending" as const,
      wasCreated: true,
    };
  },
});

export const listPending = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(resolverRequestDocValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    return await ctx.db
      .query("resolver_requests")
      .withIndex("by_status", (queryBuilder) => queryBuilder.eq("status", "pending"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const approve = mutation({
  args: {
    requestId: v.id("resolver_requests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const manager = await requireRole(ctx, "manager");
    const request = await ctx.db.get(args.requestId);

    if (!request || request.status !== "pending") {
      throw new ConvexError("Resolver request is not pending.");
    }

    const requester = await ctx.db.get(request.requesterUserId);
    if (!requester) {
      throw new ConvexError("Requester user no longer exists.");
    }

    const now = Date.now();

    await ctx.db.patch(request._id, {
      status: "approved",
      decidedAt: now,
      decidedByUserId: manager._id,
      decisionNote: null,
    });

    await ctx.db.patch(requester._id, {
      role: "resolver",
      accountStatus: "active",
      updatedAt: now,
    });

    return null;
  },
});

export const reject = mutation({
  args: {
    requestId: v.id("resolver_requests"),
    decisionNote: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const manager = await requireRole(ctx, "manager");
    const request = await ctx.db.get(args.requestId);

    if (!request || request.status !== "pending") {
      throw new ConvexError("Resolver request is not pending.");
    }

    const requester = await ctx.db.get(request.requesterUserId);
    if (!requester) {
      throw new ConvexError("Requester user no longer exists.");
    }

    const decisionNote = args.decisionNote.trim();
    if (decisionNote.length === 0) {
      throw new ConvexError("Decision note is required when rejecting a request.");
    }

    const now = Date.now();

    await ctx.db.patch(request._id, {
      status: "rejected",
      decidedAt: now,
      decidedByUserId: manager._id,
      decisionNote,
    });

    await ctx.db.patch(requester._id, {
      role: "reporter",
      accountStatus: "resolver_rejected",
      updatedAt: now,
    });

    return null;
  },
});
