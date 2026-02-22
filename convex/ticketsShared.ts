import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { requireActiveUser } from "./lib/auth";
import { canUserAccessTicket, toTicketWithImageUrl } from "./lib/tickets";
import { ticketWithHistoryValidator } from "./lib/ticketValidators";

export const getById = query({
  args: {
    ticketId: v.id("tickets"),
  },
  returns: v.union(ticketWithHistoryValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      return null;
    }

    if (!canUserAccessTicket(user, ticket)) {
      throw new ConvexError("Not authorized to view this ticket.");
    }

    const history = await ctx.db
      .query("ticket_status_history")
      .withIndex("by_ticketId_and_changedAt", (queryBuilder) =>
        queryBuilder.eq("ticketId", ticket._id),
      )
      .order("asc")
      .collect();

    const ticketWithImageUrl = await toTicketWithImageUrl(ctx, ticket);

    return {
      ticket: ticketWithImageUrl,
      history,
    };
  },
});
