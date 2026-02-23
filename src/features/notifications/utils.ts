import type { NotificationType } from "../../domain/types";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatNotificationTimestamp(value: number): string {
  return dateTimeFormatter.format(new Date(value));
}

export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "ticket_created":
      return "New Ticket";
    case "ticket_assigned":
      return "Ticket Assigned";
    case "ticket_in_progress":
      return "Work In Progress";
    case "ticket_resolved":
      return "Ticket Resolved";
    case "ticket_closed":
      return "Ticket Closed";
    case "resolver_request_submitted":
      return "Resolver Request";
    case "resolver_request_approved":
      return "Request Approved";
    case "resolver_request_rejected":
      return "Request Rejected";
    default:
      return type;
  }
}
