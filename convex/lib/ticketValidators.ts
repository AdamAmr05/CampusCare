import { v } from "convex/values";
import { ticketStatusValidator } from "./validators";

export const ticketDocValidator = v.object({
  _id: v.id("tickets"),
  _creationTime: v.number(),
  reporterUserId: v.id("users"),
  managerUserId: v.union(v.id("users"), v.null()),
  resolverUserId: v.union(v.id("users"), v.null()),
  category: v.string(),
  description: v.string(),
  location: v.string(),
  imageStorageId: v.id("_storage"),
  status: ticketStatusValidator,
  resolutionNote: v.union(v.string(), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
  resolvedAt: v.union(v.number(), v.null()),
  closedAt: v.union(v.number(), v.null()),
});

export const ticketStatusHistoryDocValidator = v.object({
  _id: v.id("ticket_status_history"),
  _creationTime: v.number(),
  ticketId: v.id("tickets"),
  changedByUserId: v.id("users"),
  fromStatus: v.union(ticketStatusValidator, v.null()),
  toStatus: ticketStatusValidator,
  note: v.union(v.string(), v.null()),
  changedAt: v.number(),
});

export const ticketWithHistoryValidator = v.object({
  ticket: ticketDocValidator,
  history: v.array(ticketStatusHistoryDocValidator),
});
