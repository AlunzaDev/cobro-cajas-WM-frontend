import type {
  PaidTicketFilters,
  PaidTicketListResult,
  PaidTicketLiveEvent,
  PaidTicketsRealtimeStatus,
  PaidTicketSummary,
} from '../../entities/boletos/paid-ticket.entity'

export interface PaidTicketRepository {
  findPaidTickets(filters: PaidTicketFilters, page: number, limit: number): Promise<PaidTicketListResult>
  getPaidTicketsSummary(filters: PaidTicketFilters): Promise<PaidTicketSummary>
  getRealtimeStatus(): Promise<PaidTicketsRealtimeStatus>
  setRealtimeEnabled(enabled: boolean): Promise<PaidTicketsRealtimeStatus>
  subscribeToPaidTickets(
    onEvent: (event: PaidTicketLiveEvent) => void,
    onStatus?: (status: PaidTicketsRealtimeStatus) => void,
  ): () => void
}
