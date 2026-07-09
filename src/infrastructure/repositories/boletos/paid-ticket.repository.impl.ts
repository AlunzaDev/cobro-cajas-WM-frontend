import type {
  PaidTicketFilters,
  PaidTicketListResult,
  PaidTicketLiveEvent,
  PaidTicketsRealtimeStatus,
  PaidTicketSummary,
} from '../../../domain/entities/boletos/paid-ticket.entity'
import type { PaidTicketRepository } from '../../../domain/repositories/boletos/paid-ticket.repository'
import type { PaidTicketHttpDatasource } from '../../datasources/boletos/paid-ticket.datasource.http'

export class PaidTicketRepositoryImpl implements PaidTicketRepository {
  private readonly datasource: PaidTicketHttpDatasource

  constructor(datasource: PaidTicketHttpDatasource) {
    this.datasource = datasource
  }

  findPaidTickets(filters: PaidTicketFilters, page: number, limit: number): Promise<PaidTicketListResult> {
    return this.datasource.findPayments(filters, page, limit)
  }

  getPaidTicketsSummary(filters: PaidTicketFilters): Promise<PaidTicketSummary> {
    return this.datasource.getPaymentsSummary(filters)
  }

  getRealtimeStatus(): Promise<PaidTicketsRealtimeStatus> {
    return this.datasource.getRealtimeStatus()
  }

  setRealtimeEnabled(enabled: boolean): Promise<PaidTicketsRealtimeStatus> {
    return this.datasource.setRealtimeEnabled(enabled)
  }

  subscribeToPaidTickets(
    onEvent: (event: PaidTicketLiveEvent) => void,
    onStatus?: (status: PaidTicketsRealtimeStatus) => void,
  ): () => void {
    return this.datasource.subscribe(onEvent, onStatus)
  }
}
