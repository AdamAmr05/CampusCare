import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  accountStatusValidator,
  onboardingIntentValidator,
  resolverRequestStatusValidator,
  userRoleValidator,
} from "./lib/validators";
import {
  getVerifiedGiuEmailOrNull,
  getCurrentUserByTokenIdentifier,
  getDisplayName,
  isManagerEmail,
  requireIdentity,
  requireVerifiedGiuEmail,
} from "./lib/auth";

type ReaderCtx = QueryCtx | MutationCtx;

const accessSummaryValidator = v.object({
  userId: v.id("users"),
  email: v.string(),
  fullName: v.string(),
  role: userRoleValidator,
  accountStatus: accountStatusValidator,
  latestResolverRequestId: v.union(v.id("resolver_requests"), v.null()),
  latestResolverRequestStatus: v.union(resolverRequestStatusValidator, v.null()),
  latestResolverDecisionNote: v.union(v.string(), v.null()),
});

async function getLatestResolverRequestForUser(
  ctx: ReaderCtx,
  userId: Id<"users">,
) {
  const requests = await ctx.db
    .query("resolver_requests")
    .withIndex("by_requesterUserId", (queryBuilder) =>
      queryBuilder.eq("requesterUserId", userId),
    )
    .order("desc")
    .take(1);

  return requests[0] ?? null;
}

async function ensurePendingResolverRequest(
  ctx: MutationCtx,
  args: {
    requesterUserId: Id<"users">;
    requesterEmail: string;
    requesterName: string;
    reason: string | null;
  },
): Promise<void> {
  const latestRequest = await getLatestResolverRequestForUser(ctx, args.requesterUserId);
  if (latestRequest?.status === "pending") {
    return;
  }

  await ctx.db.insert("resolver_requests", {
    requesterUserId: args.requesterUserId,
    requesterEmail: args.requesterEmail,
    requesterName: args.requesterName,
    reason: args.reason,
    status: "pending",
    submittedAt: Date.now(),
    decidedAt: null,
    decidedByUserId: null,
    decisionNote: null,
  });
}

async function buildAccessSummary(ctx: ReaderCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) {
    return null;
  }

  const latestRequest = await getLatestResolverRequestForUser(ctx, user._id);

  return {
    userId: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    accountStatus: user.accountStatus,
    latestResolverRequestId: latestRequest?._id ?? null,
    latestResolverRequestStatus: latestRequest?.status ?? null,
    latestResolverDecisionNote: latestRequest?.decisionNote ?? null,
  };
}

export const upsertCurrentUser = mutation({
  args: {
    intent: onboardingIntentValidator,
  },
  returns: accessSummaryValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const email = requireVerifiedGiuEmail(identity);
    const fullName = getDisplayName(identity, email);
    const now = Date.now();

    const managerAccount = isManagerEmail(email);

    const existingUser = await getCurrentUserByTokenIdentifier(ctx, identity.tokenIdentifier);

    let userId = existingUser?._id ?? null;

    if (!existingUser) {
      const role = managerAccount ? "manager" : "reporter";
      const accountStatus = managerAccount
        ? "active"
        : args.intent === "resolver"
          ? "pending_resolver_approval"
          : "active";

      userId = await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        email,
        fullName,
        role,
        accountStatus,
        createdAt: now,
        updatedAt: now,
      });

      if (!managerAccount && args.intent === "resolver") {
        await ensurePendingResolverRequest(ctx, {
          requesterUserId: userId,
          requesterEmail: email,
          requesterName: fullName,
          reason: null,
        });
      }

      const summary = await buildAccessSummary(ctx, userId);
      if (!summary) {
        throw new ConvexError("Failed to build access summary after user creation.");
      }

      return summary;
    }

    let nextRole = existingUser.role;
    let nextAccountStatus = existingUser.accountStatus;

    if (managerAccount) {
      nextRole = "manager";
      nextAccountStatus = "active";
    } else if (args.intent === "resolver" && existingUser.role !== "resolver") {
      // Rejected users must explicitly trigger reapply via resolverRequests.reapply.
      if (existingUser.accountStatus === "resolver_rejected") {
        nextRole = "reporter";
        nextAccountStatus = "resolver_rejected";
      } else {
        nextRole = "reporter";
        nextAccountStatus = "pending_resolver_approval";
      }
    } else if (
      args.intent === "reporter" &&
      existingUser.role !== "resolver" &&
      existingUser.accountStatus === "resolver_rejected"
    ) {
      // Reporter path should restore reporter access after a rejected resolver request.
      nextRole = "reporter";
      nextAccountStatus = "active";
    }

    const shouldPatch =
      nextRole !== existingUser.role ||
      nextAccountStatus !== existingUser.accountStatus ||
      existingUser.email !== email ||
      existingUser.fullName !== fullName;

    if (shouldPatch) {
      await ctx.db.patch(existingUser._id, {
        role: nextRole,
        accountStatus: nextAccountStatus,
        email,
        fullName,
        updatedAt: now,
      });
    }

    if (
      !managerAccount &&
      args.intent === "resolver" &&
      nextRole !== "resolver" &&
      nextAccountStatus === "pending_resolver_approval"
    ) {
      await ensurePendingResolverRequest(ctx, {
        requesterUserId: existingUser._id,
        requesterEmail: email,
        requesterName: fullName,
        reason: null,
      });
    }

    const summary = await buildAccessSummary(ctx, existingUser._id);
    if (!summary) {
      throw new ConvexError("Failed to build access summary after user update.");
    }

    return summary;
  },
});

export const getMyAccess = query({
  args: {},
  returns: v.union(accessSummaryValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }

    const email = getVerifiedGiuEmailOrNull(identity);
    if (email === null) {
      return null;
    }

    const user = await getCurrentUserByTokenIdentifier(ctx, identity.tokenIdentifier);
    if (!user) {
      return null;
    }

    return await buildAccessSummary(ctx, user._id);
  },
});
