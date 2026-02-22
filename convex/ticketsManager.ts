import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import {
  appendTicketStatusHistory,
  assertStatusTransition,
  normalizeOptionalText,
  TICKET_NOTE_MAX_LENGTH,
} from "./lib/tickets";
import { ticketDocValidator } from "./lib/ticketValidators";

const resolverOptionValidator = v.object({
  _id: v.id("users"),
  fullName: v.string(),
  email: v.string(),
});

export const listActiveResolvers = query({
  args: {},
  returns: v.array(resolverOptionValidator),
  handler: async (ctx) => {
    await requireRole(ctx, "manager");

    const users = await ctx.db
      .query("users")
      .withIndex("by_role_and_accountStatus", (queryBuilder) =>
        queryBuilder.eq("role", "resolver").eq("accountStatus", "active"),
      )
      .take(200);

    return users.map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
    }));
  },
});

export const listOpenUnassigned = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(ticketDocValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    return await ctx.db
      .query("tickets")
      .withIndex("by_status_and_resolverUserId_and_createdAt", (queryBuilder) =>
        queryBuilder.eq("status", "open").eq("resolverUserId", null),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const assignResolver = mutation({
  args: {
    ticketId: v.id("tickets"),
    resolverUserId: v.id("users"),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const manager = await requireRole(ctx, "manager");
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      throw new ConvexError("Ticket not found.");
    }

    const resolver = await ctx.db.get(args.resolverUserId);
    if (!resolver || resolver.role !== "resolver" || resolver.accountStatus !== "active") {
      throw new ConvexError("Resolver user must be active and approved.");
    }

    if (ticket.status === "assigned" && ticket.resolverUserId === args.resolverUserId) {
      return null;
    }

    assertStatusTransition(ticket.status, "assigned");

    const now = Date.now();
    const note = normalizeOptionalText(
      args.note,
      "Assignment note",
      TICKET_NOTE_MAX_LENGTH,
    );

    await ctx.db.patch(ticket._id, {
      managerUserId: manager._id,
      resolverUserId: args.resolverUserId,
      status: "assigned",
      updatedAt: now,
    });

    await appendTicketStatusHistory(ctx, {
      ticketId: ticket._id,
      changedByUserId: manager._id,
      fromStatus: ticket.status,
      toStatus: "assigned",
      note,
    });

    return null;
  },
});

export const listResolvedAwaitingClose = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(ticketDocValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    return await ctx.db
      .query("tickets")
      .withIndex("by_status_and_updatedAt", (queryBuilder) =>
        queryBuilder.eq("status", "resolved"),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const close = mutation({
  args: {
    ticketId: v.id("tickets"),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const manager = await requireRole(ctx, "manager");
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      throw new ConvexError("Ticket not found.");
    }

    if (ticket.status === "closed") {
      return null;
    }

    assertStatusTransition(ticket.status, "closed");

    const now = Date.now();
    const note = normalizeOptionalText(
      args.note,
      "Closure note",
      TICKET_NOTE_MAX_LENGTH,
    );

    await ctx.db.patch(ticket._id, {
      managerUserId: manager._id,
      status: "closed",
      updatedAt: now,
      closedAt: now,
    });

    await appendTicketStatusHistory(ctx, {
      ticketId: ticket._id,
      changedByUserId: manager._id,
      fromStatus: ticket.status,
      toStatus: "closed",
      note,
    });

    return null;
  },
});
