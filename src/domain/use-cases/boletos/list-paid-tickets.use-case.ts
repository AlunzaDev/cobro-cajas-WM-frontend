import type {
  PaidTicketFilters,
  PaidTicketListResult,
} from '../../entities/boletos/paid-ticket.entity'
import type { PaidTicketRepository } from '../../repositories/boletos/paid-ticket.repository'

export class ListPaidTicketsUseCase {
  private readonly repository: PaidTicketRepository

  constructor(repository: PaidTicketRepository) {
    this.repository = repository
  }

  execute(filters: PaidTicketFilters, page = 1, limit = 25): Promise<PaidTicketListResult> {
    return this.repository.findPaidTickets(filters, page, limit)
  }
}
