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
import {
  createNotificationForUser,
  listActiveManagerUserIds,
  truncateNotificationText,
} from "./lib/notifications";
import {
  buildUserPatch,
  resolveExistingAccess,
  resolveNewAccess,
} from "./lib/accessTransitions";

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
): Promise<Id<"resolver_requests"> | null> {
  const latestRequest = await getLatestResolverRequestForUser(ctx, args.requesterUserId);
  if (latestRequest?.status === "pending") {
    return null;
  }

  const requestId = await ctx.db.insert("resolver_requests", {
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

  const managerUserIds = await listActiveManagerUserIds(ctx);
  await Promise.all(
    managerUserIds.map((managerUserId) =>
      createNotificationForUser(ctx, {
        recipientUserId: managerUserId,
        actorUserId: args.requesterUserId,
        type: "resolver_request_submitted",
        title: "New resolver access request",
        body: truncateNotificationText(
          `${args.requesterName} (${args.requesterEmail}) requested resolver access.`,
          220,
        ),
        ticketId: null,
        resolverRequestId: requestId,
        dedupeKey: `resolver_request:${requestId}:submitted:recipient:${managerUserId}`,
      }),
    ),
  );

  return requestId;
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

async function buildRequiredAccessSummary(
  ctx: ReaderCtx,
  userId: Id<"users">,
  errorMessage: string,
) {
  const summary = await buildAccessSummary(ctx, userId);

  if (!summary) {
    throw new ConvexError(errorMessage);
  }

  return summary;
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
    const profile = { email, fullName };

    if (!existingUser) {
      const accessDecision = resolveNewAccess(args.intent, managerAccount);
      const userId = await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        email: profile.email,
        fullName: profile.fullName,
        role: accessDecision.role,
        accountStatus: accessDecision.accountStatus,
        createdAt: now,
        updatedAt: now,
      });

      if (accessDecision.shouldCreateResolverRequest) {
        await ensurePendingResolverRequest(ctx, {
          requesterUserId: userId,
          requesterEmail: profile.email,
          requesterName: profile.fullName,
          reason: null,
        });
      }

      return await buildRequiredAccessSummary(
        ctx,
        userId,
        "Failed to build access summary after user creation.",
      );
    }

    const accessDecision = resolveExistingAccess({
      current: existingUser,
      intent: args.intent,
      managerAccount,
    });

    const userPatch = buildUserPatch({
      current: existingUser,
      next: accessDecision,
      profile,
      now,
    });

    if (userPatch) {
      await ctx.db.patch(existingUser._id, userPatch);
    }

    if (accessDecision.shouldCreateResolverRequest) {
      await ensurePendingResolverRequest(ctx, {
        requesterUserId: existingUser._id,
        requesterEmail: profile.email,
        requesterName: profile.fullName,
        reason: null,
      });
    }

    return await buildRequiredAccessSummary(
      ctx,
      existingUser._id,
      "Failed to build access summary after user update.",
    );
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
