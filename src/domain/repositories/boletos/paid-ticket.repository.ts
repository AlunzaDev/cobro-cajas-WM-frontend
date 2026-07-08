import type {
  PaidTicketFilters,
  PaidTicketListResult,
  PaidTicketLiveEvent,
  PaidTicketSummary,
} from '../../entities/boletos/paid-ticket.entity'

export interface PaidTicketRepository {
  findPaidTickets(filters: PaidTicketFilters, page: number, limit: number): Promise<PaidTicketListResult>
  getPaidTicketsSummary(filters: PaidTicketFilters): Promise<PaidTicketSummary>
  subscribeToPaidTickets(onEvent: (event: PaidTicketLiveEvent) => void): () => void
}
