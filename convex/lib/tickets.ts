import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

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
