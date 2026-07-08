import { useEffect, useMemo, useState } from 'react'
import type {
  PaidTicketEntity,
  PaidTicketFilters,
  PaidTicketLiveEvent,
  PaidTicketSummary,
} from '../../domain/entities/boletos/paid-ticket.entity'
import { GetPaidTicketSummaryUseCase } from '../../domain/use-cases/boletos/get-paid-ticket-summary.use-case'
import { ListPaidTicketsUseCase } from '../../domain/use-cases/boletos/list-paid-tickets.use-case'
import { SubscribePaidTicketsUseCase } from '../../domain/use-cases/boletos/subscribe-paid-tickets.use-case'
import { PaidTicketHttpDatasource } from '../../infrastructure/datasources/boletos/paid-ticket.datasource.http'
import { PaidTicketRepositoryImpl } from '../../infrastructure/repositories/boletos/paid-ticket.repository.impl'

const defaultSummary: PaidTicketSummary = {
  totalTickets: 0,
  totalAmount: 0,
  reversedTickets: 0,
  activeTickets: 0,
  localTickets: 0,
  remoteTickets: 0,
}

const filters: PaidTicketFilters = {
  reversed: false,
}

export function usePaidTicketsDashboard() {
  const [tickets, setTickets] = useState<PaidTicketEntity[]>([])
  const [summary, setSummary] = useState<PaidTicketSummary>(defaultSummary)
  const [liveEvents, setLiveEvents] = useState<PaidTicketLiveEvent[]>([])
  const [selectedTicket, setSelectedTicket] = useState<PaidTicketEntity | null>(null)
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const useCases = useMemo(() => {
    const datasource = new PaidTicketHttpDatasource()
    const repository = new PaidTicketRepositoryImpl(datasource)

    return {
      listPaidTickets: new ListPaidTicketsUseCase(repository),
      getSummary: new GetPaidTicketSummaryUseCase(repository),
      subscribe: new SubscribePaidTicketsUseCase(repository),
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    Promise.all([
      useCases.listPaidTickets.execute(filters, 1, 25),
      useCases.getSummary.execute(filters),
    ])
      .then(([listResult, summaryResult]) => {
        if (!isMounted) return
        setTickets(listResult.items)
        setSummary(summaryResult)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar los tickets pagados')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [useCases])

  useEffect(() => {
    return useCases.subscribe.execute((event) => {
      const ticket = event.ticket

      if (ticket.reversed || !ticket.numAutorizacion) return

      setTickets((current) => [ticket, ...current.filter((item) => item.idBoleto !== ticket.idBoleto)].slice(0, 25))
      setLiveEvents((current) => [event, ...current].slice(0, 8))
      setSummary((current) => ({
        ...current,
        totalTickets: current.totalTickets + 1,
        activeTickets: current.activeTickets + 1,
        totalAmount: current.totalAmount + getTicketAmount(ticket),
        localTickets: current.localTickets + (ticket.source === 'local' ? 1 : 0),
        remoteTickets: current.remoteTickets + (ticket.source === 'remote' ? 1 : 0),
      }))
      setHighlightedTicketId(ticket.id ?? ticket.idBoleto)
      window.setTimeout(() => setHighlightedTicketId(null), 2800)
    })
  }, [useCases])

  return {
    tickets,
    summary,
    liveEvents,
    selectedTicket,
    highlightedTicketId,
    isLoading,
    error,
    selectTicket: setSelectedTicket,
    closeTicket: () => setSelectedTicket(null),
  }
}

export function getTicketAmount(ticket: PaidTicketEntity): number {
  return (ticket.monto ?? Number.parseFloat(ticket.montoNuevo)) || 0
}
