import type { TicketStatus } from "../../domain/types";
import { theme } from "../../ui/theme";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const relativeTimeFormatter =
  typeof Intl !== "undefined" && typeof Intl.RelativeTimeFormat === "function"
    ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
    : null;

export function formatTimestamp(value: number): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatRelativeTimestamp(value: number, now: number = Date.now()): string {
  const diffMs = value - now;
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const pick = (): { value: number; unit: Intl.RelativeTimeFormatUnit } => {
    if (absSec < 60) return { value: diffSec, unit: "second" };
    if (absSec < 3600) return { value: Math.round(diffSec / 60), unit: "minute" };
    if (absSec < 86400) return { value: Math.round(diffSec / 3600), unit: "hour" };
    if (absSec < 86400 * 7) return { value: Math.round(diffSec / 86400), unit: "day" };
    if (absSec < 86400 * 30) return { value: Math.round(diffSec / (86400 * 7)), unit: "week" };
    if (absSec < 86400 * 365) return { value: Math.round(diffSec / (86400 * 30)), unit: "month" };
    return { value: Math.round(diffSec / (86400 * 365)), unit: "year" };
  };

  if (relativeTimeFormatter === null) {
    return formatTimestamp(value);
  }

  const { value: amount, unit } = pick();
  return relativeTimeFormatter.format(amount, unit);
}

export function getTicketStatusLabel(status: TicketStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In progress";
    case "resolved":
      return "Resolved (awaiting manager)";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function getTicketStatusShortLabel(status: TicketStatus | null): string {
  if (status === null) return "New";
  switch (status) {
    case "open":
      return "Open";
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function getTicketStatusStripeColor(status: TicketStatus): string {
  switch (status) {
    case "open":
      return theme.colors.statusOpen;
    case "assigned":
      return theme.colors.statusAssigned;
    case "in_progress":
      return theme.colors.statusInProgress;
    case "resolved":
      return theme.colors.statusResolved;
    case "closed":
      return theme.colors.statusClosed;
    default:
      return theme.colors.border;
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
      return { background: "#dbe7ff", text: "#1d3f99" };
    case "in_progress":
      return { background: "#ece0ff", text: "#4c1f9a" };
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
