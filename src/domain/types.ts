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

export type OnboardingIntent = "reporter" | "resolver";

export const TICKET_STATUSES: ReadonlyArray<TicketStatus> = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
] as const;
