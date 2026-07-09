import type {
  PaidTicketEntity,
  PaidTicketFilters,
  PaidTicketListResult,
  PaidTicketLiveEvent,
  PaidTicketsRealtimeStatus,
  PaidTicketSummary,
} from '../../../domain/entities/boletos/paid-ticket.entity'
import { SocketIoClient } from './socket.io'

type PaidTicketListResponse = PaidTicketListResult & {
  ok: boolean
  items: Array<PaidTicketEntity & { uid?: string }>
}

type PaidTicketSummaryResponse = {
  ok: boolean
  summary: PaidTicketSummary
}

type PaidTicketsRealtimeStatusResponse = {
  ok: boolean
  realtime: {
    enabled: boolean
    room: string
    timestamp?: number
  }
}

type ProviderResponse = {
  idProveedor: number
  nombre: string
}

type ProviderListResponse = {
  ok: boolean
  items: ProviderResponse[]
}

export class PaidTicketHttpDatasource {
  private readonly apiUrl: string
  private readonly wsUrl: string
  private readonly socketClient: SocketIoClient

  constructor(apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080', wsUrl = import.meta.env.VITE_PAID_TICKETS_WS_URL) {
    this.apiUrl = apiUrl
    this.wsUrl = wsUrl || this.buildWebSocketUrl(apiUrl)
    this.socketClient = new SocketIoClient()
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

  async getRealtimeStatus(): Promise<PaidTicketsRealtimeStatus> {
    const response = await fetch(`${this.apiUrl}/api/boletos/pagados/realtime/status`)
    if (!response.ok) throw new Error('No fue posible consultar el estado del socket')
    const data = (await response.json()) as PaidTicketsRealtimeStatusResponse

    return {
      ...data.realtime,
      connected: Boolean(this.socketClient.getCurrentSocket()?.connected),
    }
  }

  async setRealtimeEnabled(enabled: boolean): Promise<PaidTicketsRealtimeStatus> {
    const response = await fetch(`${this.apiUrl}/api/boletos/pagados/realtime/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled }),
    })

    if (!response.ok) throw new Error(`No fue posible ${enabled ? 'activar' : 'desactivar'} el socket`)

    const data = (await response.json()) as PaidTicketsRealtimeStatusResponse

    return {
      ...data.realtime,
      connected: Boolean(this.socketClient.getCurrentSocket()?.connected),
    }
  }

  async getProviders(): Promise<ProviderResponse[]> {
    const response = await fetch(`${this.apiUrl}/api/proveedores?page=1&limit=100`)
    if (!response.ok) throw new Error('No fue posible consultar proveedores')
    const data = (await response.json()) as ProviderListResponse
    return data.items
  }

  subscribe(
    onEvent: (event: PaidTicketLiveEvent) => void,
    onStatus?: (status: PaidTicketsRealtimeStatus) => void,
  ): () => void {
    const socket = this.socketClient.connect(this.wsUrl)

    const emitClientStatus = (enabled?: boolean, room = 'paidtickets', timestamp?: number) => {
      onStatus?.({
        enabled: enabled ?? false,
        room,
        timestamp,
        connected: socket.connected,
      })
    }

    socket.on('paidtickets:changed', (payload: { paidTicket: PaidTicketEntity; paidTicketLegacy?: PaidTicketEntity }) => {
      const ticket = payload.paidTicketLegacy ?? payload.paidTicket
      const event: PaidTicketLiveEvent = {
        id: `${ticket.idBoleto}-${Date.now()}`,
        type: 'paid-ticket',
        ticket: this.mapLegacyTicket(ticket),
        receivedAt: new Date().toISOString(),
      }
      onEvent(event)
    })

    socket.on('connect', () => {
      emitClientStatus(undefined)
    })

    socket.on('disconnect', () => {
      emitClientStatus(undefined)
    })

    socket.on('paidtickets:status', (payload: { enabled: boolean; room: string; timestamp?: number }) => {
      emitClientStatus(payload.enabled, payload.room, payload.timestamp)
    })

    return () => {
      socket.off('paidtickets:changed')
      socket.off('connect')
      socket.off('disconnect')
      socket.off('paidtickets:status')
      this.socketClient.disconnect()
    }
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
    url.pathname = '/'
    url.search = ''
    url.hash = ''
    return url.toString()
  }
}
