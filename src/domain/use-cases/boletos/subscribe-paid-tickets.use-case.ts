import type { PaidTicketLiveEvent } from '../../entities/boletos/paid-ticket.entity'
import type { PaidTicketRepository } from '../../repositories/boletos/paid-ticket.repository'

export class SubscribePaidTicketsUseCase {
  private readonly repository: PaidTicketRepository

  constructor(repository: PaidTicketRepository) {
    this.repository = repository
  }

  execute(onEvent: (event: PaidTicketLiveEvent) => void): () => void {
    return this.repository.subscribeToPaidTickets(onEvent)
  }
}
