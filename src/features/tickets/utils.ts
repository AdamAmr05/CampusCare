import type { TicketStatus } from "../../domain/types";
import { theme } from "../../ui/theme";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatTimestamp(value: number): string {
  return dateTimeFormatter.format(new Date(value));
}

export function getTicketStatusLabel(status: TicketStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved (Awaiting Manager)";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function getTicketStatusColors(status: TicketStatus): {
  background: string;
  text: string;
} {
  switch (status) {
    case "open":
      return { background: "#fff4cd", text: "#7a5b00" };
    case "assigned":
      return { background: "#ffe8b5", text: "#5e4200" };
    case "in_progress":
      return { background: "#ffd4c2", text: "#7d2500" };
    case "resolved":
      return { background: "#d9efd9", text: theme.colors.success };
    case "closed":
      return { background: "#e9e9e9", text: "#2e2e2e" };
    default:
      return { background: "#f0f0f0", text: theme.colors.textSecondary };
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}
