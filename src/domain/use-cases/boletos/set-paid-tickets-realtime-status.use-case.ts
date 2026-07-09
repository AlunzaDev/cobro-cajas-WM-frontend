import type { PaidTicketsRealtimeStatus } from '../../entities/boletos/paid-ticket.entity'
import type { PaidTicketRepository } from '../../repositories/boletos/paid-ticket.repository'

export class SetPaidTicketsRealtimeStatusUseCase {
  private readonly repository: PaidTicketRepository

  constructor(repository: PaidTicketRepository) {
    this.repository = repository
  }

  execute(enabled: boolean): Promise<PaidTicketsRealtimeStatus> {
    return this.repository.setRealtimeEnabled(enabled)
  }
}
