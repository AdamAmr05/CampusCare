import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import {
  appendTicketStatusHistory,
  assertStatusTransition,
  normalizeOptionalText,
  TICKET_NOTE_MAX_LENGTH,
  toTicketWithImageUrl,
} from "./lib/tickets";
import {
  createNotificationForUser,
  truncateNotificationText,
} from "./lib/notifications";
import { ticketWithImageUrlValidator } from "./lib/ticketValidators";
import { ticketStatusValidator } from "./lib/validators";

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
  returns: paginationResultValidator(ticketWithImageUrlValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    const paginated = await ctx.db
      .query("tickets")
      .withIndex("by_status_and_resolverUserId_and_createdAt", (queryBuilder) =>
        queryBuilder.eq("status", "open").eq("resolverUserId", null),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      paginated.page.map((ticket) => toTicketWithImageUrl(ctx, ticket)),
    );

    return {
      ...paginated,
      page,
    };
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

    const sharedBody = `${ticket.category} • ${ticket.location}`;
    const resolverBody = truncateNotificationText(
      `${sharedBody}. Assigned by ${manager.fullName}.`,
      220,
    );
    const reporterBody = truncateNotificationText(
      `${sharedBody}. Assigned to ${resolver.fullName}.`,
      220,
    );

    await Promise.all([
      createNotificationForUser(ctx, {
        recipientUserId: resolver._id,
        actorUserId: manager._id,
        type: "ticket_assigned",
        title: "New ticket assigned",
        body: resolverBody,
        ticketId: ticket._id,
        resolverRequestId: null,
        dedupeKey: `ticket:${ticket._id}:assigned:recipient:${resolver._id}`,
      }),
      createNotificationForUser(ctx, {
        recipientUserId: ticket.reporterUserId,
        actorUserId: manager._id,
        type: "ticket_assigned",
        title: "Ticket assigned",
        body: reporterBody,
        ticketId: ticket._id,
        resolverRequestId: null,
        dedupeKey: `ticket:${ticket._id}:assigned:recipient:${ticket.reporterUserId}`,
      }),
    ]);

    return null;
  },
});

export const listResolvedAwaitingClose = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(ticketWithImageUrlValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    const paginated = await ctx.db
      .query("tickets")
      .withIndex("by_status_and_updatedAt", (queryBuilder) =>
        queryBuilder.eq("status", "resolved"),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      paginated.page.map((ticket) => toTicketWithImageUrl(ctx, ticket)),
    );

    return {
      ...paginated,
      page,
    };
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

    const reporterBody = truncateNotificationText(
      `${ticket.category} at ${ticket.location} has been closed by management.`,
      220,
    );

    await createNotificationForUser(ctx, {
      recipientUserId: ticket.reporterUserId,
      actorUserId: manager._id,
      type: "ticket_closed",
      title: "Ticket closed",
      body: reporterBody,
      ticketId: ticket._id,
      resolverRequestId: null,
      dedupeKey: `ticket:${ticket._id}:closed:recipient:${ticket.reporterUserId}`,
    });

    if (ticket.resolverUserId !== null) {
      const resolverBody = truncateNotificationText(
        `${ticket.category} at ${ticket.location} was closed after review.`,
        220,
      );
      await createNotificationForUser(ctx, {
        recipientUserId: ticket.resolverUserId,
        actorUserId: manager._id,
        type: "ticket_closed",
        title: "Resolved ticket closed",
        body: resolverBody,
        ticketId: ticket._id,
        resolverRequestId: null,
        dedupeKey: `ticket:${ticket._id}:closed:recipient:${ticket.resolverUserId}`,
      });
    }

    return null;
  },
});

const monitorStatusFilterValidator = v.union(
  v.literal("all"),
  ticketStatusValidator,
);

export const listMonitor = query({
  args: {
    statusFilter: monitorStatusFilterValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(ticketWithImageUrlValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, "manager");

    const statusFilter = args.statusFilter;
    const baseQuery =
      statusFilter === "all"
        ? ctx.db.query("tickets").withIndex("by_updatedAt")
        : ctx.db
            .query("tickets")
            .withIndex("by_status_and_updatedAt", (queryBuilder) =>
              queryBuilder.eq("status", statusFilter),
            );

    const paginated = await baseQuery
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      paginated.page.map((ticket) => toTicketWithImageUrl(ctx, ticket)),
    );

    return {
      ...paginated,
      page,
    };
  },
});

const monitorCountValidator = v.object({
  value: v.number(),
  isCapped: v.boolean(),
});

const monitorCountsValidator = v.object({
  open: monitorCountValidator,
  assigned: monitorCountValidator,
  in_progress: monitorCountValidator,
  resolved: monitorCountValidator,
  closed: monitorCountValidator,
});

function toCappedCount(length: number, cap: number) {
  return {
    value: Math.min(length, cap),
    isCapped: length > cap,
  };
}

export const monitorCounts = query({
  args: {},
  returns: monitorCountsValidator,
  handler: async (ctx) => {
    await requireRole(ctx, "manager");

    const COUNT_CAP = 200;
    const countLimit = COUNT_CAP + 1;

    const [openTickets, assignedTickets, inProgressTickets, resolvedTickets, closedTickets] =
      await Promise.all([
        ctx.db
          .query("tickets")
          .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "open"))
          .take(countLimit),
        ctx.db
          .query("tickets")
          .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "assigned"))
          .take(countLimit),
        ctx.db
          .query("tickets")
          .withIndex("by_status_and_updatedAt", (q) =>
            q.eq("status", "in_progress"),
          )
          .take(countLimit),
        ctx.db
          .query("tickets")
          .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "resolved"))
          .take(countLimit),
        ctx.db
          .query("tickets")
          .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "closed"))
          .take(countLimit),
      ]);

    return {
      open: toCappedCount(openTickets.length, COUNT_CAP),
      assigned: toCappedCount(assignedTickets.length, COUNT_CAP),
      in_progress: toCappedCount(inProgressTickets.length, COUNT_CAP),
      resolved: toCappedCount(resolvedTickets.length, COUNT_CAP),
      closed: toCappedCount(closedTickets.length, COUNT_CAP),
    };
  },
});
