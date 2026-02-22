import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type TicketStatus = Doc<"tickets">["status"];

const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, ReadonlyArray<TicketStatus>> = {
  open: ["assigned"],
  assigned: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["closed"],
  closed: [],
};

export const TICKET_CATEGORY_MAX_LENGTH = 80;
export const TICKET_LOCATION_MAX_LENGTH = 140;
export const TICKET_DESCRIPTION_MAX_LENGTH = 1200;
export const TICKET_NOTE_MAX_LENGTH = 1200;
export const TICKET_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const TICKET_IMAGE_MAX_MEGABYTES = 8;

export function normalizeRequiredText(
  value: string,
  fieldName: string,
  maxLength: number,
): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ConvexError(`${fieldName} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new ConvexError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

export function normalizeOptionalText(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new ConvexError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

export function assertStatusTransition(fromStatus: TicketStatus, toStatus: TicketStatus): void {
  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus];
  if (!allowed.includes(toStatus)) {
    throw new ConvexError(
      `Invalid status transition from ${fromStatus} to ${toStatus}.`,
    );
  }
}

export function canUserAccessTicket(
  user: Doc<"users">,
  ticket: Doc<"tickets">,
): boolean {
  if (user.role === "manager") {
    return true;
  }

  if (user.role === "reporter") {
    return ticket.reporterUserId === user._id;
  }

  return ticket.resolverUserId === user._id;
}

type StorageMetadata = {
  contentType?: string | null;
  size?: number;
};

export function assertValidTicketImageFile(file: StorageMetadata | null): void {
  if (!file) {
    throw new ConvexError("Uploaded image was not found. Please try again.");
  }

  const contentType =
    typeof file.contentType === "string" ? file.contentType.toLowerCase() : null;
  const hasUnsupportedContentType = Boolean(
    contentType &&
      !contentType.startsWith("image/") &&
      contentType !== "application/octet-stream",
  );

  if (hasUnsupportedContentType) {
    throw new ConvexError("Uploaded file must be an image.");
  }

  if (typeof file.size !== "number" || file.size > TICKET_IMAGE_MAX_BYTES) {
    throw new ConvexError(
      `Image must be ${TICKET_IMAGE_MAX_MEGABYTES}MB or smaller.`,
    );
  }
}

export type TicketWithImageUrl = Omit<Doc<"tickets">, "resolutionImageStorageId"> & {
  resolutionImageStorageId: Id<"_storage"> | null;
  imageUrl: string | null;
  resolutionImageUrl: string | null;
};

export async function toTicketWithImageUrl(
  ctx: QueryCtx,
  ticket: Doc<"tickets">,
): Promise<TicketWithImageUrl> {
  const resolutionImageStorageId = ticket.resolutionImageStorageId ?? null;
  const imageUrlPromise = ctx.storage.getUrl(ticket.imageStorageId);
  const resolutionImageUrlPromise = resolutionImageStorageId
    ? ctx.storage.getUrl(resolutionImageStorageId)
    : Promise.resolve(null);
  const [imageUrl, resolutionImageUrl] = await Promise.all([
    imageUrlPromise,
    resolutionImageUrlPromise,
  ]);

  return {
    ...ticket,
    resolutionImageStorageId,
    imageUrl,
    resolutionImageUrl,
  };
}

export async function appendTicketStatusHistory(
  ctx: MutationCtx,
  args: {
    ticketId: Id<"tickets">;
    changedByUserId: Id<"users">;
    fromStatus: TicketStatus | null;
    toStatus: TicketStatus;
    note: string | null;
  },
): Promise<void> {
  await ctx.db.insert("ticket_status_history", {
    ticketId: args.ticketId,
    changedByUserId: args.changedByUserId,
    fromStatus: args.fromStatus,
    toStatus: args.toStatus,
    note: args.note,
    changedAt: Date.now(),
  });
}
