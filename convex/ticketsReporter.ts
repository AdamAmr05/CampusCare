import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  appendTicketStatusHistory,
  assertValidTicketImageFile,
  normalizeRequiredText,
  TICKET_CATEGORY_MAX_LENGTH,
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_LOCATION_MAX_LENGTH,
  toTicketWithImageUrl,
} from "./lib/tickets";
import {
  ticketWithImageUrlValidator,
  ticketWithHistoryValidator,
} from "./lib/ticketValidators";
import { requireRoleIn } from "./lib/auth";

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
    const reporter = await requireRoleIn(ctx, ["reporter", "resolver"]);
    const uploadedFile = await ctx.db.system.get("_storage", args.imageStorageId);
    assertValidTicketImageFile(uploadedFile);

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
      resolutionImageStorageId: null,
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

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireRoleIn(ctx, ["reporter", "resolver"]);
    return await ctx.storage.generateUploadUrl();
  },
});

export const deleteUnusedUpload = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRoleIn(ctx, ["reporter", "resolver"]);

    const referencedReporterImages = await ctx.db
      .query("tickets")
      .withIndex("by_imageStorageId", (queryBuilder) =>
        queryBuilder.eq("imageStorageId", args.storageId),
      )
      .take(1);

    if (referencedReporterImages.length > 0) {
      return null;
    }

    const referencedResolutionImages = await ctx.db
      .query("tickets")
      .withIndex("by_resolutionImageStorageId", (queryBuilder) =>
        queryBuilder.eq("resolutionImageStorageId", args.storageId),
      )
      .take(1);

    if (referencedResolutionImages.length > 0) {
      return null;
    }

    const uploadedFile = await ctx.db.system.get("_storage", args.storageId);
    if (!uploadedFile) {
      return null;
    }

    await ctx.storage.delete(args.storageId);
    return null;
  },
});

export const listMine = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(ticketWithImageUrlValidator),
  handler: async (ctx, args) => {
    const reporter = await requireRoleIn(ctx, ["reporter", "resolver"]);

    const paginated = await ctx.db
      .query("tickets")
      .withIndex("by_reporterUserId_and_createdAt", (queryBuilder) =>
        queryBuilder.eq("reporterUserId", reporter._id),
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

export const getMineById = query({
  args: {
    ticketId: v.id("tickets"),
  },
  returns: v.union(ticketWithHistoryValidator, v.null()),
  handler: async (ctx, args) => {
    const reporter = await requireRoleIn(ctx, ["reporter", "resolver"]);
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      return null;
    }

    if (ticket.reporterUserId !== reporter._id) {
      return null;
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
