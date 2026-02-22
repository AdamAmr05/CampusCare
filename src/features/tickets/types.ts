import type { Id } from "../../../convex/_generated/dataModel";
import type { TicketStatus } from "../../domain/types";

export type Ticket = {
  _id: Id<"tickets">;
  reporterUserId: Id<"users">;
  managerUserId: Id<"users"> | null;
  resolverUserId: Id<"users"> | null;
  category: string;
  description: string;
  location: string;
  imageStorageId: Id<"_storage">;
  imageUrl: string | null;
  resolutionImageStorageId: Id<"_storage"> | null;
  resolutionImageUrl: string | null;
  status: TicketStatus;
  resolutionNote: string | null;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
  closedAt: number | null;
};

export type TicketStatusHistoryEntry = {
  _id: Id<"ticket_status_history">;
  ticketId: Id<"tickets">;
  changedByUserId: Id<"users">;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  note: string | null;
  changedAt: number;
};

export type TicketWithHistory = {
  ticket: Ticket;
  history: TicketStatusHistoryEntry[];
};

export type ResolverOption = {
  _id: Id<"users">;
  fullName: string;
  email: string;
};
