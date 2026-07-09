import type { PaidTicketEntity, PaidTicketLiveEvent, PaidTicketSummary } from '../../../domain/entities/boletos/paid-ticket.entity'
import { BaseCombobox } from '../../components/shared/BaseCombobox/BaseCombobox'
import { FilterSidebar } from '../../components/shared/FilterSidebar'
import { getTicketAmount, usePaidTicketsDashboard } from '../../hooks/usePaidTicketsDashboard'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

const sourceOptions = [
  { id: 'local', nombre: 'Solo local' },
  { id: 'remote', nombre: 'Solo remoto' },
]

const pageSizeOptions = [
  { id: '10', nombre: '10 por pagina' },
  { id: '20', nombre: '20 por pagina' },
  { id: '50', nombre: '50 por pagina' },
]

export function PaidTicketsDashboard() {
  const {
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
    selectTicket,
    closeTicket,
    openFilterSidebar,
    closeFilterSidebar,
    updateFilterField,
    applyFilters,
    resetFilters,
    setCurrentPage,
    updatePageSize,
    toggleRealtime,
    exportCurrentFiltersToExcel,
  } = usePaidTicketsDashboard()

  const totalPagesSafe = Math.max(1, totalPages)
  const fromItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const toItem = total === 0 ? 0 : Math.min(page * pageSize, total)
  const activeScopeLabel = `${appliedFilterForm.fromDate || '--'} ${appliedFilterForm.fromTime || '00:00'} a ${appliedFilterForm.toDate || '--'} ${appliedFilterForm.toTime || '23:59'}`
  const selectedProviderLabel =
    providerOptions.find((option) => option.id === appliedFilterForm.idProveedor)?.nombre ?? appliedFilterForm.idProveedor

  const socketLabel = realtimeStatus.connected
    ? realtimeStatus.enabled
      ? 'Socket activo'
      : 'Socket conectado pero apagado'
    : 'Socket desconectado'
  const socketSyncLabel = realtimeStatus.timestamp
    ? new Date(realtimeStatus.timestamp).toLocaleString('es-MX')
    : 'Sin lectura del backend'
  const lastEventLabel = lastSocketEventAt ? new Date(lastSocketEventAt).toLocaleString('es-MX') : 'Sin eventos aun'

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Monitoreo en tiempo real</p>
          <h1>Tickets pagados y validados</h1>
          <p className="dashboard-header__subtitle">
            La vista arranca filtrada al dia de hoy y ahora consulta por pagina directo al backend.
          </p>
        </div>
        <div className="dashboard-header__actions">
          <button type="button" className="ghost-action" onClick={openFilterSidebar}>
            Filtros {hasActiveFilters ? 'activos' : ''}
          </button>
          <div className={`socket-pill ${realtimeStatus.connected ? 'is-connected' : 'is-disconnected'} ${realtimeStatus.enabled ? 'is-enabled' : 'is-disabled'}`}>
            <span className="pulse-dot" />
            {socketLabel}
          </div>
          <button type="button" className="ghost-action" onClick={toggleRealtime} disabled={isUpdatingRealtime}>
            {isUpdatingRealtime ? 'Actualizando...' : realtimeStatus.enabled ? 'Desactivar socket' : 'Activar socket'}
          </button>
        </div>
      </header>

      <section className="socket-insights">
        <article>
          <span>Ultima sincronizacion de estado</span>
          <strong>{socketSyncLabel}</strong>
        </article>
        <article>
          <span>Ultimo evento recibido</span>
          <strong>{lastEventLabel}</strong>
        </article>
      </section>

      <KpiGrid summary={summary} tickets={tickets} />

      <section className="active-filters-bar">
        <span className="active-chip active-chip--accent">{activeScopeLabel}</span>
        {appliedFilterForm.search && <span className="active-chip">Busqueda {appliedFilterForm.search}</span>}
        {appliedFilterForm.tda && <span className="active-chip">Caja {appliedFilterForm.tda}</span>}
        {appliedFilterForm.idProveedor && <span className="active-chip">Proveedor {selectedProviderLabel}</span>}
        {appliedFilterForm.idBoleto && <span className="active-chip">Folio {appliedFilterForm.idBoleto}</span>}
        {appliedFilterForm.source !== 'all' && <span className="active-chip">Origen {appliedFilterForm.source}</span>}
      </section>

      <section className="dashboard-workspace">
        <div className="tickets-panel">
          <div className="panel-header">
            <div>
              <h2>Pagos recientes</h2>
              <p>
                {isLoading
                  ? 'Cargando tickets...'
                  : `${fromItem}-${toItem} de ${total} tickets en la consulta actual`}
              </p>
            </div>
            <div className="filter-row">
              <label className="toolbar-search">
                <span>Buscar</span>
                <input
                  type="search"
                  value={filterForm.search}
                  onChange={(event) => updateFilterField('search', event.target.value)}
                  placeholder="Folio, caja, tienda, proveedor o autorizacion"
                />
              </label>
              <div className="page-size-box">
                <span>Vista</span>
                <BaseCombobox
                  placeholder="Buscar tamano"
                  allLabel="20 por pagina"
                  iconTitle="Cambiar tamano de pagina"
                  options={pageSizeOptions}
                  value={String(pageSize)}
                  showAllOption={false}
                  onChange={(value) => updatePageSize(Number(value ?? '20'))}
                />
              </div>
              <button type="button" className="ghost-action" onClick={() => void exportCurrentFiltersToExcel()} disabled={isExporting}>
                {isExporting ? 'Exportando...' : 'Descargar Excel'}
              </button>
              <button type="button" className="ghost-action" onClick={openFilterSidebar}>
                Abrir filtros
              </button>
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

          <footer className="pagination-bar">
            <div>
              <strong>Pagina {page}</strong>
              <span>
                {' '}
                de {totalPagesSafe} · Mostrando {fromItem}-{toItem}
              </span>
            </div>
            <div className="pagination-actions">
              <button type="button" onClick={() => setCurrentPage(page - 1)} disabled={page <= 1}>
                Anterior
              </button>
              <button type="button" onClick={() => setCurrentPage(page + 1)} disabled={page >= totalPagesSafe}>
                Siguiente
              </button>
            </div>
          </footer>
        </div>

        <LiveFeed events={liveEvents} />
      </section>

      <FilterSidebar
        open={filterSidebarOpen}
        title="Filtrar tickets"
        onClose={closeFilterSidebar}
        onApply={applyFilters}
        onReset={resetFilters}
      >
        <div className="filters-form">
          <label className="filters-field">
            <span>Buscador rapido</span>
            <input
              type="search"
              value={filterForm.search}
              onChange={(event) => updateFilterField('search', event.target.value)}
              placeholder="Folio, caja, tienda, proveedor o autorizacion"
            />
          </label>

          <label className="filters-field">
            <span>Folio</span>
            <input
              type="text"
              value={filterForm.idBoleto}
              onChange={(event) => updateFilterField('idBoleto', event.target.value)}
              placeholder="Ej. 011234567890"
            />
          </label>

          <label className="filters-field">
            <span>Caja</span>
            <input
              type="text"
              value={filterForm.tda}
              onChange={(event) => updateFilterField('tda', event.target.value)}
              placeholder="Ej. 05"
            />
          </label>

          <div className="filters-field">
            <span>Proveedor</span>
            <BaseCombobox
              placeholder="Buscar proveedor"
              allLabel="Todos los proveedores"
              iconTitle="Seleccionar proveedor"
              options={providerOptions}
              value={filterForm.idProveedor || undefined}
              onChange={(value) => updateFilterField('idProveedor', value ?? '')}
            />
          </div>

          <div className="filters-field">
            <span>Origen</span>
            <BaseCombobox
              placeholder="Buscar origen"
              allLabel="Todos los origenes"
              iconTitle="Seleccionar origen"
              options={sourceOptions}
              value={filterForm.source === 'all' ? undefined : filterForm.source}
              onChange={(value) => updateFilterField('source', (value as 'local' | 'remote' | undefined) ?? 'all')}
            />
          </div>

          <label className="filters-field">
            <span>Dia desde</span>
            <input
              type="date"
              value={filterForm.fromDate}
              onChange={(event) => updateFilterField('fromDate', event.target.value)}
            />
          </label>

          <label className="filters-field">
            <span>Hora desde</span>
            <input
              type="time"
              value={filterForm.fromTime}
              onChange={(event) => updateFilterField('fromTime', event.target.value)}
            />
          </label>

          <label className="filters-field">
            <span>Dia hasta</span>
            <input
              type="date"
              value={filterForm.toDate}
              onChange={(event) => updateFilterField('toDate', event.target.value)}
            />
          </label>

          <label className="filters-field">
            <span>Hora hasta</span>
            <input
              type="time"
              value={filterForm.toTime}
              onChange={(event) => updateFilterField('toTime', event.target.value)}
            />
          </label>
        </div>
      </FilterSidebar>

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
