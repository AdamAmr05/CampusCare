import { useQuery } from "convex/react";
import React, { memo } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { TicketDetailsPanel } from "../tickets/TicketDetailsPanel";
import type { Ticket, TicketWithHistory } from "../tickets/types";

export const ReporterTicketDetailsModal = memo(function ReporterTicketDetailsModal(props: {
  visible: boolean;
  selectedTicketId: Id<"tickets"> | null;
  previewTicket: Ticket | null;
  onClose: () => void;
}): React.JSX.Element {
  const selectedTicket = useQuery(
    api.ticketsReporter.getMineById,
    props.visible && props.selectedTicketId ? { ticketId: props.selectedTicketId } : "skip",
  ) as TicketWithHistory | null | undefined;

  return (
    <TicketDetailsPanel
      visible={props.visible}
      ticket={selectedTicket?.ticket ?? props.previewTicket}
      historyEntries={selectedTicket === undefined ? undefined : selectedTicket?.history ?? null}
      onClose={props.onClose}
      historyUnavailableText="Status history is unavailable for this ticket."
    />
  );
});
