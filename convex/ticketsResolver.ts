import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import {
  appendTicketStatusHistory,
  assertStatusTransition,
  normalizeOptionalText,
  normalizeRequiredText,
  TICKET_NOTE_MAX_LENGTH,
} from "./lib/tickets";
import { ticketDocValidator } from "./lib/ticketValidators";

export const listAssignedToMe = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(ticketDocValidator),
  handler: async (ctx, args) => {
    const resolver = await requireRole(ctx, "resolver");

    return await ctx.db
      .query("tickets")
      .withIndex("by_resolverUserId_and_updatedAt", (queryBuilder) =>
        queryBuilder.eq("resolverUserId", resolver._id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const setInProgress = mutation({
  args: {
    ticketId: v.id("tickets"),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const resolver = await requireRole(ctx, "resolver");
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      throw new ConvexError("Ticket not found.");
    }

    if (ticket.resolverUserId !== resolver._id) {
      throw new ConvexError("Not authorized to update this ticket.");
    }

    if (ticket.status === "in_progress") {
      return null;
    }

    assertStatusTransition(ticket.status, "in_progress");

    const now = Date.now();
    const note = normalizeOptionalText(
      args.note,
      "Progress note",
      TICKET_NOTE_MAX_LENGTH,
    );

    await ctx.db.patch(ticket._id, {
      status: "in_progress",
      updatedAt: now,
    });

    await appendTicketStatusHistory(ctx, {
      ticketId: ticket._id,
      changedByUserId: resolver._id,
      fromStatus: ticket.status,
      toStatus: "in_progress",
      note,
    });

    return null;
  },
});

export const markResolved = mutation({
  args: {
    ticketId: v.id("tickets"),
    resolutionNote: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const resolver = await requireRole(ctx, "resolver");
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      throw new ConvexError("Ticket not found.");
    }

    if (ticket.resolverUserId !== resolver._id) {
      throw new ConvexError("Not authorized to update this ticket.");
    }

    const resolutionNote = normalizeRequiredText(
      args.resolutionNote,
      "Resolution note",
      TICKET_NOTE_MAX_LENGTH,
    );

    if (ticket.status === "resolved") {
      if (ticket.resolutionNote === resolutionNote) {
        return null;
      }

      throw new ConvexError(
        "Ticket is already resolved and awaiting manager closure. Resolution note cannot be changed.",
      );
    }

    assertStatusTransition(ticket.status, "resolved");

    const now = Date.now();

    await ctx.db.patch(ticket._id, {
      status: "resolved",
      resolutionNote,
      updatedAt: now,
      resolvedAt: now,
    });

    await appendTicketStatusHistory(ctx, {
      ticketId: ticket._id,
      changedByUserId: resolver._id,
      fromStatus: ticket.status,
      toStatus: "resolved",
      note: resolutionNote,
    });

    return null;
  },
});
