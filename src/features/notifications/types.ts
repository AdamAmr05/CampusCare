import type { Id } from "../../../convex/_generated/dataModel";
import type { NotificationType } from "../../domain/types";

export type AppNotification = {
  _id: Id<"notifications">;
  recipientUserId: Id<"users">;
  actorUserId: Id<"users"> | null;
  type: NotificationType;
  title: string;
  body: string;
  ticketId: Id<"tickets"> | null;
  resolverRequestId: Id<"resolver_requests"> | null;
  dedupeKey: string | null;
  createdAt: number;
  readAt: number | null;
};
