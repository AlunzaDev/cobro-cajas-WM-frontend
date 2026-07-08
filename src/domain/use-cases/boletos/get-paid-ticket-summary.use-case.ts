import type {
  PaidTicketFilters,
  PaidTicketSummary,
} from '../../entities/boletos/paid-ticket.entity'
import type { PaidTicketRepository } from '../../repositories/boletos/paid-ticket.repository'

export class GetPaidTicketSummaryUseCase {
  private readonly repository: PaidTicketRepository

  constructor(repository: PaidTicketRepository) {
    this.repository = repository
  }

  execute(filters: PaidTicketFilters): Promise<PaidTicketSummary> {
    return this.repository.getPaidTicketsSummary(filters)
  }
}
