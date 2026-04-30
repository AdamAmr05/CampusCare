import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
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

// DEFERRED: Deactivating a resolver who already owns tickets in `assigned` or
// `in_progress` strands those tickets. The deactivated resolver can no longer
// progress them (their resolver mutations require an active account), and the
// manager has no reassignment flow today (assignResolver only handles
// `open -> assigned`, not `assigned -> assigned` to a different resolver, and
// not `in_progress -> assigned`). Until a manager-side reassignment mutation
// exists, those tickets are stuck unless the same resolver is reactivated.
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
