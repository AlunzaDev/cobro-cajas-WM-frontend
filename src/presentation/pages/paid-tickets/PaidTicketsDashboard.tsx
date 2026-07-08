import type { PaidTicketEntity, PaidTicketLiveEvent, PaidTicketSummary } from '../../../domain/entities/boletos/paid-ticket.entity'
import { getTicketAmount, usePaidTicketsDashboard } from '../../hooks/usePaidTicketsDashboard'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export function PaidTicketsDashboard() {
  const {
    tickets,
    summary,
    liveEvents,
    selectedTicket,
    highlightedTicketId,
    isLoading,
    error,
    selectTicket,
    closeTicket,
  } = usePaidTicketsDashboard()

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Monitoreo en tiempo real</p>
          <h1>Tickets pagados y validados</h1>
        </div>
        <div className="socket-pill">
          <span className="pulse-dot" />
          Socket real
        </div>
      </header>

      <KpiGrid summary={summary} tickets={tickets} />

      <section className="dashboard-workspace">
        <div className="tickets-panel">
          <div className="panel-header">
            <div>
              <h2>Pagos recientes</h2>
              <p>{isLoading ? 'Cargando tickets...' : `${tickets.length} tickets visibles`}</p>
            </div>
            <div className="filter-row">
              <button type="button">Hoy</button>
              <button type="button">Todas las cajas</button>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Caja</th>
                  <th>Tienda</th>
                  <th>Monto</th>
                  <th>Hora</th>
                  <th>Autorizacion</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && tickets.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-empty">No hay tickets pagados y validados para mostrar.</div>
                    </td>
                  </tr>
                )}

                {tickets.map((ticket) => {
                  const ticketKey = ticket.id ?? ticket.idBoleto

                  return (
                    <tr
                      key={ticketKey}
                      className={highlightedTicketId === ticketKey ? 'row-highlight' : undefined}
                      onClick={() => selectTicket(ticket)}
                    >
                      <td>
                        <strong>{ticket.idBoleto}</strong>
                        <span>{ticket.source === 'local' ? 'Local' : 'Remoto'}</span>
                      </td>
                      <td>{ticket.tda}</td>
                      <td>{ticket.nombreTienda || 'Sin tienda'}</td>
                      <td>{currencyFormatter.format(getTicketAmount(ticket))}</td>
                      <td>{ticket.horaCobro}</td>
                      <td>
                        <span className="status-chip">{ticket.numAutorizacion}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <LiveFeed events={liveEvents} />
      </section>

      {selectedTicket && <TicketDrawer ticket={selectedTicket} onClose={closeTicket} />}
    </main>
  )
}

function KpiGrid({ summary, tickets }: { summary: PaidTicketSummary; tickets: PaidTicketEntity[] }) {
  const lastTicket = tickets[0]

  return (
    <section className="kpi-grid">
      <article>
        <span>Pagados activos</span>
        <strong>{summary.activeTickets}</strong>
      </article>
      <article>
        <span>Total cobrado</span>
        <strong>{currencyFormatter.format(summary.totalAmount)}</strong>
      </article>
      <article>
        <span>Locales / remotos</span>
        <strong>
          {summary.localTickets} / {summary.remoteTickets}
        </strong>
      </article>
      <article>
        <span>Ultimo pago</span>
        <strong>{lastTicket ? lastTicket.horaCobro : '--:--'}</strong>
      </article>
    </section>
  )
}

function LiveFeed({ events }: { events: PaidTicketLiveEvent[] }) {
  return (
    <aside className="live-feed">
      <div className="panel-header">
        <div>
          <h2>En vivo</h2>
          <p>Eventos recibidos por socket</p>
        </div>
      </div>

      <div className="live-list">
        {events.length === 0 && (
          <div className="empty-state">
            <span className="pulse-dot" />
            Esperando nuevos pagos
          </div>
        )}

        {events.map((event) => (
          <button type="button" className="live-event" key={event.id}>
            <span>{event.ticket.idBoleto}</span>
            <strong>{currencyFormatter.format(getTicketAmount(event.ticket))}</strong>
            <small>
              {event.ticket.tda} - {event.ticket.horaCobro}
            </small>
          </button>
        ))}
      </div>
    </aside>
  )
}

function TicketDrawer({ ticket, onClose }: { ticket: PaidTicketEntity; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="ticket-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Detalle de ticket</p>
            <h2>{ticket.idBoleto}</h2>
          </div>
          <button type="button" aria-label="Cerrar detalle" onClick={onClose}>
            x
          </button>
        </div>

        <div className="receipt">
          <div className="receipt-title">
            <strong>Comprobante de pago</strong>
            <span>{ticket.numAutorizacion}</span>
          </div>

          <dl>
            <div>
              <dt>Caja</dt>
              <dd>{ticket.tda}</dd>
            </div>
            <div>
              <dt>Tienda</dt>
              <dd>{ticket.nombreTienda || 'Sin tienda'}</dd>
            </div>
            <div>
              <dt>Proveedor</dt>
              <dd>{ticket.nombreProveedor || ticket.idProveedor}</dd>
            </div>
            <div>
              <dt>Combo</dt>
              <dd>{ticket.nombreCombo || 'Sin combo'}</dd>
            </div>
            <div>
              <dt>Entrada</dt>
              <dd>
                {ticket.fechaEntrada} {ticket.horaEntrada}
              </dd>
            </div>
            <div>
              <dt>Cobro</dt>
              <dd>
                {ticket.fechaCobro} {ticket.horaCobro}
              </dd>
            </div>
            <div>
              <dt>Duracion</dt>
              <dd>{ticket.duracion}</dd>
            </div>
            <div>
              <dt>Respuesta</dt>
              <dd>{ticket.descripcionError || 'Autorizado'}</dd>
            </div>
          </dl>

          <div className="receipt-total">
            <span>Total</span>
            <strong>{currencyFormatter.format(getTicketAmount(ticket))}</strong>
          </div>
        </div>
      </aside>
    </div>
  )
}
