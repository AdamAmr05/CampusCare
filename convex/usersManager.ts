import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { accountStatusValidator, userRoleValidator } from "./lib/validators";

const directoryFilterValidator = v.union(
  v.literal("resolvers"),
  v.literal("managers"),
);

const directoryEntryValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  email: v.string(),
  fullName: v.string(),
  role: userRoleValidator,
  accountStatus: accountStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listDirectory = query({
  args: {
    filter: directoryFilterValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(directoryEntryValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    const role = args.filter === "resolvers" ? "resolver" : "manager";

    const paginated = await ctx.db
      .query("users")
      .withIndex("by_role_and_accountStatus", (queryBuilder) =>
        queryBuilder.eq("role", role).eq("accountStatus", "active"),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const page = paginated.page.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return {
      ...paginated,
      page,
    };
  },
});

const directoryCountValidator = v.object({
  value: v.number(),
  isCapped: v.boolean(),
});

const directoryCountsValidator = v.object({
  approvals: directoryCountValidator,
  resolvers: directoryCountValidator,
  managers: directoryCountValidator,
  inactive: directoryCountValidator,
});

function toCappedCount(length: number, cap: number) {
  return {
    value: Math.min(length, cap),
    isCapped: length > cap,
  };
}

const ACTIVE_RESOLVER_TICKET_COUNT_CAP = 5;

async function getActiveResolverTicketSummary(
  ctx: MutationCtx,
  resolverUserId: Id<"users">,
) {
  const limit = ACTIVE_RESOLVER_TICKET_COUNT_CAP + 1;

  const [assignedTickets, inProgressTickets] = await Promise.all([
    ctx.db
      .query("tickets")
      .withIndex("by_status_and_resolverUserId_and_createdAt", (queryBuilder) =>
        queryBuilder.eq("status", "assigned").eq("resolverUserId", resolverUserId),
      )
      .take(limit),
    ctx.db
      .query("tickets")
      .withIndex("by_status_and_resolverUserId_and_createdAt", (queryBuilder) =>
        queryBuilder.eq("status", "in_progress").eq("resolverUserId", resolverUserId),
      )
      .take(limit),
  ]);

  return {
    assignedCount: Math.min(
      assignedTickets.length,
      ACTIVE_RESOLVER_TICKET_COUNT_CAP,
    ),
    inProgressCount: Math.min(
      inProgressTickets.length,
      ACTIVE_RESOLVER_TICKET_COUNT_CAP,
    ),
    isCapped:
      assignedTickets.length > ACTIVE_RESOLVER_TICKET_COUNT_CAP ||
      inProgressTickets.length > ACTIVE_RESOLVER_TICKET_COUNT_CAP,
  };
}

function formatActiveTicketCount(
  count: number,
  label: "assigned" | "in-progress",
) {
  return `${count} ${label} ${count === 1 ? "ticket" : "tickets"}`;
}

function buildActiveResolverTicketsError(summary: {
  assignedCount: number;
  inProgressCount: number;
  isCapped: boolean;
}) {
  if (summary.isCapped) {
    return "Cannot deactivate this resolver while they have active tickets. Reassign or resolve 5+ active tickets first.";
  }

  const parts = [
    summary.assignedCount > 0
      ? formatActiveTicketCount(summary.assignedCount, "assigned")
      : null,
    summary.inProgressCount > 0
      ? formatActiveTicketCount(summary.inProgressCount, "in-progress")
      : null,
  ].filter((part): part is string => part !== null);

  return `Cannot deactivate this resolver while they have active tickets. Reassign or resolve ${parts.join(
    " and ",
  )} first.`;
}

export const directoryCounts = query({
  args: {},
  returns: directoryCountsValidator,
  handler: async (ctx) => {
    await requireRole(ctx, "manager");

    const COUNT_CAP = 200;
    const countLimit = COUNT_CAP + 1;

    const [
      pendingRequests,
      activeResolvers,
      activeManagers,
      inactiveResolvers,
    ] = await Promise.all([
      ctx.db
        .query("resolver_requests")
        .withIndex("by_status", (queryBuilder) =>
          queryBuilder.eq("status", "pending"),
        )
        .take(countLimit),
      ctx.db
        .query("users")
        .withIndex("by_role_and_accountStatus", (queryBuilder) =>
          queryBuilder.eq("role", "resolver").eq("accountStatus", "active"),
        )
        .take(countLimit),
      ctx.db
        .query("users")
        .withIndex("by_role_and_accountStatus", (queryBuilder) =>
          queryBuilder.eq("role", "manager").eq("accountStatus", "active"),
        )
        .take(countLimit),
      ctx.db
        .query("users")
        .withIndex("by_role_and_accountStatus", (queryBuilder) =>
          queryBuilder.eq("role", "resolver").eq("accountStatus", "inactive"),
        )
        .take(countLimit),
    ]);

    return {
      approvals: toCappedCount(pendingRequests.length, COUNT_CAP),
      resolvers: toCappedCount(activeResolvers.length, COUNT_CAP),
      managers: toCappedCount(activeManagers.length, COUNT_CAP),
      inactive: toCappedCount(inactiveResolvers.length, COUNT_CAP),
    };
  },
});

export const deactivateResolver = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const manager = await requireRole(ctx, "manager");

    if (manager._id === args.userId) {
      throw new ConvexError("You cannot deactivate yourself.");
    }

    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new ConvexError("User not found.");
    }

    if (user.role !== "resolver") {
      throw new ConvexError("Only resolvers can be deactivated from the directory.");
    }

    if (user.accountStatus === "inactive") {
      return null;
    }

    const activeTicketSummary = await getActiveResolverTicketSummary(ctx, user._id);
    if (
      activeTicketSummary.assignedCount > 0 ||
      activeTicketSummary.inProgressCount > 0
    ) {
      throw new ConvexError(
        buildActiveResolverTicketsError(activeTicketSummary),
      );
    }

    await ctx.db.patch(user._id, {
      accountStatus: "inactive",
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const reactivateResolver = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new ConvexError("User not found.");
    }

    if (user.role !== "resolver") {
      throw new ConvexError("Only resolvers can be reactivated.");
    }

    if (user.accountStatus === "active") {
      return null;
    }

    if (user.accountStatus !== "inactive") {
      throw new ConvexError(
        "Only deactivated resolvers can be reactivated from the directory.",
      );
    }

    await ctx.db.patch(user._id, {
      accountStatus: "active",
      updatedAt: Date.now(),
    });

    return null;
  },
});

const inactiveResolverEntryValidator = directoryEntryValidator;

export const listInactiveResolvers = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(inactiveResolverEntryValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    const paginated = await ctx.db
      .query("users")
      .withIndex("by_role_and_accountStatus", (queryBuilder) =>
        queryBuilder.eq("role", "resolver").eq("accountStatus", "inactive"),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const page = paginated.page.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return {
      ...paginated,
      page,
    };
  },
});
