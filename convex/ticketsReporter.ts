import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  appendTicketStatusHistory,
  normalizeRequiredText,
  TICKET_CATEGORY_MAX_LENGTH,
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_LOCATION_MAX_LENGTH,
} from "./lib/tickets";
import {
  ticketDocValidator,
  ticketWithHistoryValidator,
} from "./lib/ticketValidators";
import { requireRole } from "./lib/auth";

const createTicketResponseValidator = v.object({
  ticketId: v.id("tickets"),
});

export const create = mutation({
  args: {
    category: v.string(),
    description: v.string(),
    location: v.string(),
    imageStorageId: v.id("_storage"),
  },
  returns: createTicketResponseValidator,
  handler: async (ctx, args) => {
    const reporter = await requireRole(ctx, "reporter");

    const category = normalizeRequiredText(args.category, "Category", TICKET_CATEGORY_MAX_LENGTH);
    const description = normalizeRequiredText(
      args.description,
      "Description",
      TICKET_DESCRIPTION_MAX_LENGTH,
    );
    const location = normalizeRequiredText(args.location, "Location", TICKET_LOCATION_MAX_LENGTH);
    const now = Date.now();

    const ticketId = await ctx.db.insert("tickets", {
      reporterUserId: reporter._id,
      managerUserId: null,
      resolverUserId: null,
      category,
      description,
      location,
      imageStorageId: args.imageStorageId,
      status: "open",
      resolutionNote: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      closedAt: null,
    });

    await appendTicketStatusHistory(ctx, {
      ticketId,
      changedByUserId: reporter._id,
      fromStatus: null,
      toStatus: "open",
      note: null,
    });

    return { ticketId };
  },
});

export const listMine = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(ticketDocValidator),
  handler: async (ctx, args) => {
    const reporter = await requireRole(ctx, "reporter");

    return await ctx.db
      .query("tickets")
      .withIndex("by_reporterUserId_and_createdAt", (queryBuilder) =>
        queryBuilder.eq("reporterUserId", reporter._id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMineById = query({
  args: {
    ticketId: v.id("tickets"),
  },
  returns: v.union(ticketWithHistoryValidator, v.null()),
  handler: async (ctx, args) => {
    const reporter = await requireRole(ctx, "reporter");
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      return null;
    }

    if (ticket.reporterUserId !== reporter._id) {
      throw new ConvexError("Not authorized to view this ticket.");
    }

    const history = await ctx.db
      .query("ticket_status_history")
      .withIndex("by_ticketId_and_changedAt", (queryBuilder) =>
        queryBuilder.eq("ticketId", ticket._id),
      )
      .order("asc")
      .collect();

    return {
      ticket,
      history,
    };
  },
});
