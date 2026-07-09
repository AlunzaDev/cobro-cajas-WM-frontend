export type PaidTicketSource = 'local' | 'remote'

export interface PaidTicketEntity {
  id?: string
  idBoleto: string
  te: string
  tr: string
  tda: string
  idProveedor: number
  nombreProveedor?: string
  nombreTienda?: string
  nombreCombo?: string
  detCombo?: number | null
  monto?: number
  fechaEntrada: string
  horaEntrada: string
  fechaCobro: string
  horaCobro: string
  duracion: string
  codRepuesta: string
  codigoError: string
  descripcionError: string
  numAutorizacion: string
  montoNuevo: string
  tiempoAdicional: string
  source: PaidTicketSource
  reversed: boolean
  reversedAt?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface PaidTicketFilters {
  idBoleto?: string
  tda?: string
  idProveedor?: number
  reversed?: boolean
  source?: PaidTicketSource
  from?: string
  to?: string
}

export interface PaidTicketListResult {
  items: PaidTicketEntity[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaidTicketSummary {
  totalTickets: number
  totalAmount: number
  reversedTickets: number
  activeTickets: number
  localTickets: number
  remoteTickets: number
}

export interface PaidTicketLiveEvent {
  id: string
  type: 'paid-ticket'
  ticket: PaidTicketEntity
  receivedAt: string
}

export interface PaidTicketsRealtimeStatus {
  enabled: boolean
  room: string
  timestamp?: number
  connected: boolean
}
