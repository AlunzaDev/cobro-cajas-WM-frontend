import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PaidTicketEntity,
  PaidTicketFilters,
  PaidTicketLiveEvent,
  PaidTicketsRealtimeStatus,
  PaidTicketSummary,
} from '../../domain/entities/boletos/paid-ticket.entity'
import { GetPaidTicketsRealtimeStatusUseCase } from '../../domain/use-cases/boletos/get-paid-tickets-realtime-status.use-case'
import { GetPaidTicketSummaryUseCase } from '../../domain/use-cases/boletos/get-paid-ticket-summary.use-case'
import { ListPaidTicketsUseCase } from '../../domain/use-cases/boletos/list-paid-tickets.use-case'
import { SetPaidTicketsRealtimeStatusUseCase } from '../../domain/use-cases/boletos/set-paid-tickets-realtime-status.use-case'
import { SubscribePaidTicketsUseCase } from '../../domain/use-cases/boletos/subscribe-paid-tickets.use-case'
import { PaidTicketHttpDatasource } from '../../infrastructure/datasources/boletos/paid-ticket.datasource.http'
import { PaidTicketRepositoryImpl } from '../../infrastructure/repositories/boletos/paid-ticket.repository.impl'
import type { ComboOption } from '../components/shared/BaseCombobox/BaseCombobox'
import { addObjectSheet, createWorkbook, downloadWorkbook, type ExcelRow } from '../utils/excelWorkbook'

const defaultSummary: PaidTicketSummary = {
  totalTickets: 0,
  totalAmount: 0,
  reversedTickets: 0,
  activeTickets: 0,
  localTickets: 0,
  remoteTickets: 0,
}

export type PaidTicketSourceFilter = 'all' | 'local' | 'remote'

export type PaidTicketFilterForm = {
  search: string
  idBoleto: string
  tda: string
  idProveedor: string
  source: PaidTicketSourceFilter
  fromDate: string
  fromTime: string
  toDate: string
  toTime: string
}

const defaultRealtimeStatus: PaidTicketsRealtimeStatus = {
  enabled: false,
  room: 'paidtickets',
  connected: false,
}

const DEFAULT_PAGE_SIZE = 20
const LIVE_EVENTS_LIMIT = 8

function getTodayDateValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createDefaultFilterForm(): PaidTicketFilterForm {
  const today = getTodayDateValue()

  return {
    search: '',
    idBoleto: '',
    tda: '',
    idProveedor: '',
    source: 'all',
    fromDate: today,
    fromTime: '00:00',
    toDate: today,
    toTime: '23:59',
  }
}

function buildDateTimeValue(date: string, time: string) {
  if (!date) return undefined
  return `${date}T${time || '00:00'}:00`
}

function buildFilters(form: PaidTicketFilterForm): PaidTicketFilters {
  return {
    reversed: false,
    idBoleto: form.idBoleto.trim() || undefined,
    tda: form.tda.trim() || undefined,
    idProveedor: form.idProveedor.trim() ? Number.parseInt(form.idProveedor.trim(), 10) : undefined,
    source: form.source === 'all' ? undefined : form.source,
    from: buildDateTimeValue(form.fromDate, form.fromTime),
    to: buildDateTimeValue(form.toDate, form.toTime),
  }
}

function matchesDate(ticket: PaidTicketEntity, from?: string, to?: string) {
  const baseDate = ticket.createdAt ?? ticket.updatedAt
  if (!baseDate) return true

  const ticketDate = new Date(baseDate)
  if (Number.isNaN(ticketDate.getTime())) return true

  if (from) {
    const fromDate = new Date(from)
    if (!Number.isNaN(fromDate.getTime()) && ticketDate < fromDate) return false
  }

  if (to) {
    const toDate = new Date(to)
    if (!Number.isNaN(toDate.getTime()) && ticketDate > toDate) return false
  }
  return true
}

function matchesFilters(ticket: PaidTicketEntity, form: PaidTicketFilterForm) {
  if (ticket.reversed) return false
  if (!ticket.numAutorizacion) return false
  if (form.search.trim()) {
    const search = form.search.trim().toLowerCase()
    const searchable = [
      ticket.idBoleto,
      ticket.tda,
      ticket.nombreTienda,
      ticket.nombreProveedor,
      ticket.numAutorizacion,
      ticket.idProveedor,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (!searchable.includes(search)) return false
  }
  if (form.idBoleto.trim() && ticket.idBoleto !== form.idBoleto.trim()) return false
  if (form.tda.trim() && ticket.tda !== form.tda.trim()) return false
  if (form.idProveedor.trim() && String(ticket.idProveedor) !== form.idProveedor.trim()) return false
  if (form.source !== 'all' && ticket.source !== form.source) return false
  return matchesDate(
    ticket,
    buildDateTimeValue(form.fromDate, form.fromTime),
    buildDateTimeValue(form.toDate, form.toTime),
  )
}

export function usePaidTicketsDashboard() {
  const [tickets, setTickets] = useState<PaidTicketEntity[]>([])
  const [summary, setSummary] = useState<PaidTicketSummary>(defaultSummary)
  const [liveEvents, setLiveEvents] = useState<PaidTicketLiveEvent[]>([])
  const [selectedTicket, setSelectedTicket] = useState<PaidTicketEntity | null>(null)
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false)
  const [filterForm, setFilterForm] = useState<PaidTicketFilterForm>(() => createDefaultFilterForm())
  const [appliedFilterForm, setAppliedFilterForm] = useState<PaidTicketFilterForm>(() => createDefaultFilterForm())
  const [realtimeStatus, setRealtimeStatus] = useState<PaidTicketsRealtimeStatus>(defaultRealtimeStatus)
  const [isUpdatingRealtime, setIsUpdatingRealtime] = useState(false)
  const [lastSocketEventAt, setLastSocketEventAt] = useState<string | null>(null)
  const [providerOptions, setProviderOptions] = useState<ComboOption[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const requestIdRef = useRef(0)

  const useCases = useMemo(() => {
    const datasource = new PaidTicketHttpDatasource()
    const repository = new PaidTicketRepositoryImpl(datasource)

    return {
      listPaidTickets: new ListPaidTicketsUseCase(repository),
      getSummary: new GetPaidTicketSummaryUseCase(repository),
      getRealtimeStatus: new GetPaidTicketsRealtimeStatusUseCase(repository),
      setRealtimeStatus: new SetPaidTicketsRealtimeStatusUseCase(repository),
      subscribe: new SubscribePaidTicketsUseCase(repository),
    }
  }, [])

  const appliedFilters = useMemo(() => buildFilters(appliedFilterForm), [appliedFilterForm])

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      const currentRequestId = requestIdRef.current + 1
      requestIdRef.current = currentRequestId

      if (!silent) setIsLoading(true)

      try {
        const [listResult, summaryResult] = await Promise.all([
          useCases.listPaidTickets.execute(appliedFilters, page, pageSize),
          useCases.getSummary.execute(appliedFilters),
        ])

        if (requestIdRef.current !== currentRequestId) return

        setTickets(listResult.items)
        setSummary(summaryResult)
        setTotal(listResult.total)
        setTotalPages(listResult.totalPages)
        setError(null)
      } catch (loadError: unknown) {
        if (requestIdRef.current !== currentRequestId) return
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar los tickets pagados')
      } finally {
        if (requestIdRef.current === currentRequestId && !silent) {
          setIsLoading(false)
        }
      }
    },
    [appliedFilters, page, pageSize, useCases],
  )

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    let cancelled = false

    const loadProviders = async () => {
      try {
        const datasource = new PaidTicketHttpDatasource()
        const providers = await datasource.getProviders()

        if (cancelled) return

        setProviderOptions(
          providers.map((provider) => ({
            id: String(provider.idProveedor),
            nombre: `${provider.idProveedor} - ${provider.nombre}`,
          })),
        )
      } catch {
        if (!cancelled) setProviderOptions([])
      }
    }

    void loadProviders()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void useCases.getRealtimeStatus.execute().then(setRealtimeStatus).catch(() => {
      setRealtimeStatus((current) => ({ ...current, connected: false }))
    })

    return useCases.subscribe.execute(
      (event) => {
        const ticket = event.ticket

        if (ticket.reversed || !ticket.numAutorizacion) return

        setLiveEvents((current) => [event, ...current].slice(0, LIVE_EVENTS_LIMIT))
        setLastSocketEventAt(event.receivedAt)

        if (!matchesFilters(ticket, appliedFilterForm)) return

        setHighlightedTicketId(ticket.id ?? ticket.idBoleto)

        if (page === 1) {
          setTickets((current) => [ticket, ...current.filter((item) => item.idBoleto !== ticket.idBoleto)].slice(0, pageSize))
        }

        void loadDashboard({ silent: true })
        setHighlightedTicketId(ticket.id ?? ticket.idBoleto)
        window.setTimeout(() => setHighlightedTicketId(null), 2800)
      },
      (status) => {
        setRealtimeStatus(status)
      },
    )
  }, [appliedFilterForm, loadDashboard, page, pageSize, useCases])

  const updateFilterField = useCallback(<K extends keyof PaidTicketFilterForm>(field: K, value: PaidTicketFilterForm[K]) => {
    setFilterForm((current) => ({ ...current, [field]: value }))
  }, [])

  const applyFilters = useCallback(() => {
    setAppliedFilterForm(filterForm)
    setPage(1)
    setFilterSidebarOpen(false)
  }, [filterForm])

  const resetFilters = useCallback(() => {
    const nextFilters = createDefaultFilterForm()
    setFilterForm(nextFilters)
    setAppliedFilterForm(nextFilters)
    setPage(1)
  }, [])

  const setCurrentPage = useCallback((nextPage: number) => {
    setPage((current) => {
      const boundedPage = Math.max(1, nextPage)
      return current === boundedPage ? current : boundedPage
    })
  }, [])

  const updatePageSize = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize)
    setPage(1)
  }, [])

  const hasActiveFilters = useMemo(() => {
    const defaults = createDefaultFilterForm()

    return (
      appliedFilterForm.search !== defaults.search ||
      appliedFilterForm.idBoleto !== defaults.idBoleto ||
      appliedFilterForm.tda !== defaults.tda ||
      appliedFilterForm.idProveedor !== defaults.idProveedor ||
      appliedFilterForm.source !== defaults.source ||
      appliedFilterForm.fromDate !== defaults.fromDate ||
      appliedFilterForm.fromTime !== defaults.fromTime ||
      appliedFilterForm.toDate !== defaults.toDate ||
      appliedFilterForm.toTime !== defaults.toTime
    )
  }, [appliedFilterForm])

  const toggleRealtime = useCallback(async () => {
    setIsUpdatingRealtime(true)

    try {
      const nextStatus = await useCases.setRealtimeStatus.execute(!realtimeStatus.enabled)
      setRealtimeStatus(nextStatus)
    } catch (toggleError: unknown) {
      setError(toggleError instanceof Error ? toggleError.message : 'No fue posible actualizar el socket')
    } finally {
      setIsUpdatingRealtime(false)
    }
  }, [realtimeStatus.enabled, useCases])

  const exportCurrentFiltersToExcel = useCallback(async () => {
    setIsExporting(true)

    try {
      const exportLimit = 100
      const firstPage = await useCases.listPaidTickets.execute(appliedFilters, 1, exportLimit)

      const pagesToLoad = Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
        useCases.listPaidTickets.execute(appliedFilters, index + 2, exportLimit),
      )

      const restPages = pagesToLoad.length > 0 ? await Promise.all(pagesToLoad) : []
      const allTickets = [firstPage, ...restPages].flatMap((result) => result.items)

      const workbook = createWorkbook()
      const rows: ExcelRow[] = allTickets.map((ticket) => ({
        Folio: ticket.idBoleto,
        Caja: ticket.tda,
        Tienda: ticket.nombreTienda || '',
        Proveedor: ticket.nombreProveedor || ticket.idProveedor,
        Origen: ticket.source === 'local' ? 'Local' : 'Remoto',
        Monto: getTicketAmount(ticket),
        'Fecha entrada': ticket.fechaEntrada,
        'Hora entrada': ticket.horaEntrada,
        'Fecha cobro': ticket.fechaCobro,
        'Hora cobro': ticket.horaCobro,
        Duracion: ticket.duracion,
        Autorizacion: ticket.numAutorizacion,
        Respuesta: ticket.descripcionError || 'Autorizado',
      }))

      addObjectSheet(
        workbook,
        'Tickets',
        rows,
        [
          'Folio',
          'Caja',
          'Tienda',
          'Proveedor',
          'Origen',
          'Monto',
          'Fecha entrada',
          'Hora entrada',
          'Fecha cobro',
          'Hora cobro',
          'Duracion',
          'Autorizacion',
          'Respuesta',
        ],
        [22, 10, 24, 28, 12, 14, 14, 12, 14, 12, 14, 18, 28],
      )

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      await downloadWorkbook(workbook, `tickets-pagados-${stamp}.xlsx`)
    } finally {
      setIsExporting(false)
    }
  }, [appliedFilters, useCases])

  return {
    tickets,
    summary,
    liveEvents,
    selectedTicket,
    highlightedTicketId,
    isLoading,
    error,
    page,
    pageSize,
    total,
    totalPages,
    filterSidebarOpen,
    filterForm,
    appliedFilterForm,
    hasActiveFilters,
    providerOptions,
    realtimeStatus,
    isUpdatingRealtime,
    lastSocketEventAt,
    isExporting,
    selectTicket: setSelectedTicket,
    closeTicket: () => setSelectedTicket(null),
    openFilterSidebar: () => setFilterSidebarOpen(true),
    closeFilterSidebar: () => setFilterSidebarOpen(false),
    updateFilterField,
    applyFilters,
    resetFilters,
    setCurrentPage,
    updatePageSize,
    toggleRealtime,
    exportCurrentFiltersToExcel,
  }
}

export function getTicketAmount(ticket: PaidTicketEntity): number {
  return (ticket.monto ?? Number.parseFloat(ticket.montoNuevo)) || 0
}
