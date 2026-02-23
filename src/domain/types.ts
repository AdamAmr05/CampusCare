export type UserRole = "reporter" | "resolver" | "manager";

export type AccountStatus =
  | "active"
  | "pending_resolver_approval"
  | "resolver_rejected";

export type ResolverRequestStatus = "pending" | "approved" | "rejected";

export type TicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed";

export type NotificationType =
  | "ticket_created"
  | "ticket_assigned"
  | "ticket_in_progress"
  | "ticket_resolved"
  | "ticket_closed"
  | "resolver_request_submitted"
  | "resolver_request_approved"
  | "resolver_request_rejected";

export type NotificationPushStatus = "pending" | "sent" | "failed" | "skipped";

export type OnboardingIntent = "reporter" | "resolver";

export const TICKET_STATUSES: ReadonlyArray<TicketStatus> = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
] as const;
