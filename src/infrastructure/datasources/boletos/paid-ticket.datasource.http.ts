import type {
  PaidTicketEntity,
  PaidTicketFilters,
  PaidTicketListResult,
  PaidTicketLiveEvent,
  PaidTicketSummary,
} from '../../../domain/entities/boletos/paid-ticket.entity'

type PaidTicketListResponse = PaidTicketListResult & {
  ok: boolean
  items: Array<PaidTicketEntity & { uid?: string }>
}

type PaidTicketSummaryResponse = {
  ok: boolean
  summary: PaidTicketSummary
}

export class PaidTicketHttpDatasource {
  private readonly apiUrl: string
  private readonly wsUrl: string

  constructor(apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080', wsUrl = import.meta.env.VITE_PAID_TICKETS_WS_URL) {
    this.apiUrl = apiUrl
    this.wsUrl = wsUrl || this.buildWebSocketUrl(apiUrl)
  }

  async findPayments(filters: PaidTicketFilters, page: number, limit: number): Promise<PaidTicketListResult> {
    const params = this.buildParams(filters, page, limit)

    const response = await fetch(`${this.apiUrl}/api/boletos/pagados?${params}`)
    if (!response.ok) throw new Error('No fue posible consultar tickets pagados')
    const data = (await response.json()) as PaidTicketListResponse

    return {
      ...data,
      items: data.items.map((item) => this.mapLegacyTicket(item)),
    }
  }

  async getPaymentsSummary(filters: PaidTicketFilters): Promise<PaidTicketSummary> {
    const params = this.buildParams(filters)

    const response = await fetch(`${this.apiUrl}/api/boletos/pagados/resumen?${params}`)
    if (!response.ok) throw new Error('No fue posible consultar resumen')
    const data = (await response.json()) as PaidTicketSummaryResponse

    return data.summary
  }

  subscribe(onEvent: (event: PaidTicketLiveEvent) => void): () => void {
    const socket = new WebSocket(this.wsUrl)
    socket.addEventListener('message', (message) => {
      const event = JSON.parse(message.data as string) as PaidTicketLiveEvent
      onEvent(event)
    })

    return () => socket.close()
  }

  private buildParams(filters: PaidTicketFilters, page?: number, limit?: number): URLSearchParams {
    const params = new URLSearchParams()

    if (page) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    params.set('reversed', String(filters.reversed ?? false))
    if (filters.idBoleto) params.set('idBoleto', filters.idBoleto)
    if (filters.tda) params.set('tda', filters.tda)
    if (typeof filters.idProveedor === 'number') params.set('idProveedor', String(filters.idProveedor))
    if (filters.source) params.set('source', filters.source)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)

    return params
  }

  private mapLegacyTicket(ticket: PaidTicketEntity & { uid?: string }): PaidTicketEntity {
    return {
      ...ticket,
      id: ticket.id ?? ticket.uid,
    }
  }

  private buildWebSocketUrl(apiUrl: string): string {
    const url = new URL(apiUrl)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = '/ws/paid-tickets'
    url.search = ''
    url.hash = ''
    return url.toString()
  }
}
