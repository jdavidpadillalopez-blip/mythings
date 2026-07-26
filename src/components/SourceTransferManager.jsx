import { useState } from 'react'
import { ArrowRightLeft, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatUSD, formatDate } from '../utils/format'
import DataTable from './DataTable'
import useSortablePaginatedList from '../hooks/useSortablePaginatedList'

function todayISODate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Tracks internal conversions of money already registered as income — e.g. withdrawing $100 USD
 * from a Deel balance as physical cash. This is deliberately NOT another income entry: the money
 * was already counted once in IncomeForm, so re-adding it here would double the totals. It's a
 * side ledger that answers "where did my Deel income actually end up, and at what real rate" —
 * useful because a cash-out rate is rarely identical to the TRM (state.trm.rate) used elsewhere.
 */
export default function SourceTransferManager() {
  const { state, dispatch } = useApp()
  const { incomeSources, sourceTransfers, trm } = state

  const [fromSource, setFromSource] = useState(incomeSources[0]?.nombre ?? '')
  const [toSource, setToSource] = useState(incomeSources[1]?.nombre ?? incomeSources[0]?.nombre ?? '')
  const [amountUSD, setAmountUSD] = useState('')
  const [amountCOP, setAmountCOP] = useState('')
  const [date, setDate] = useState(todayISODate())
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)

  const table = useSortablePaginatedList(sourceTransfers, { defaultSortColumn: 'date', pageSize: 8 })

  const parsedUSD = Number(amountUSD)
  const parsedCOP = Number(amountCOP)
  const canPreview = Number.isFinite(parsedUSD) && parsedUSD > 0 && Number.isFinite(parsedCOP) && parsedCOP > 0
  const previewRate = canPreview ? parsedCOP / parsedUSD : null
  const trmRate = Number(trm?.rate || 0)
  const previewDeltaPct = previewRate && trmRate > 0 ? (previewRate - trmRate) / trmRate : null

  function handleSubmit(e) {
    e.preventDefault()
    if (!fromSource || !toSource) {
      setError('Selecciona la fuente de origen y destino')
      return
    }
    if (!Number.isFinite(parsedUSD) || parsedUSD <= 0) {
      setError('El monto en USD debe ser mayor que 0')
      return
    }
    if (!Number.isFinite(parsedCOP) || parsedCOP <= 0) {
      setError('El monto recibido en COP debe ser mayor que 0')
      return
    }
    if (!date) {
      setError('Selecciona una fecha')
      return
    }

    setError(null)
    dispatch({
      type: 'ADD_SOURCE_TRANSFER',
      payload: {
        id: crypto.randomUUID(),
        fromSource,
        toSource,
        amountUSD: parsedUSD,
        amountCOP: parsedCOP,
        trmRateSnapshot: trmRate,
        date: new Date(date).toISOString(),
        note: note.trim() || null,
      },
    })
    setAmountUSD('')
    setAmountCOP('')
    setNote('')
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-400">
        <ArrowRightLeft size={16} />
        Conversión entre fuentes
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Para cuando pasas dinero ya registrado como ingreso de una fuente a otra — por ejemplo, retirar
        USD de Deel como efectivo. Esto no suma un ingreso nuevo, solo deja constancia de a qué tasa
        real se hizo el cambio.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select
          value={fromSource}
          onChange={(e) => setFromSource(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
        >
          {incomeSources.map((s) => (
            <option key={s.id} value={s.nombre}>
              {s.nombre}
            </option>
          ))}
        </select>
        <select
          value={toSource}
          onChange={(e) => setToSource(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
        >
          {incomeSources.map((s) => (
            <option key={s.id} value={s.nombre}>
              {s.nombre}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amountUSD}
          onChange={(e) => {
            setAmountUSD(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Monto USD (entra)"
          className={`rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 ${
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
              : 'border-slate-700 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
          }`}
        />
        <input
          type="number"
          step="1"
          min="0"
          value={amountCOP}
          onChange={(e) => {
            setAmountCOP(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Monto COP recibido"
          className={`rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 ${
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
              : 'border-slate-700 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
          }`}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 sm:col-span-2 lg:col-span-3"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-cyan-500 lg:col-span-2"
        >
          <ArrowRightLeft size={16} />
          Registrar conversión
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {canPreview && (
        <p className="mt-2 text-xs text-slate-400">
          Tasa efectiva: <span className="font-semibold text-slate-200">{formatCOP(previewRate)}</span> por
          USD
          {trmRate > 0 && previewDeltaPct !== null && (
            <>
              {' '}
              · TRM actual: {formatCOP(trmRate)} ·{' '}
              <span className={previewDeltaPct < 0 ? 'text-red-400' : 'text-emerald-400'}>
                {previewDeltaPct >= 0 ? '+' : ''}
                {(previewDeltaPct * 100).toFixed(1)}% vs. TRM
              </span>
            </>
          )}
        </p>
      )}

      <div className="mt-3">
        <DataTable
          columns={[
            { key: 'date', label: 'Fecha', render: (row) => formatDate(row.date) },
            {
              key: 'ruta',
              label: 'Ruta',
              sortable: false,
              render: (row) => (
                <span className="whitespace-nowrap">
                  {row.fromSource} <span className="text-slate-600">→</span> {row.toSource}
                </span>
              ),
            },
            { key: 'amountUSD', label: 'USD', render: (row) => formatUSD(row.amountUSD) },
            { key: 'amountCOP', label: 'COP recibidos', render: (row) => formatCOP(row.amountCOP) },
            {
              key: 'tasa',
              label: 'Tasa efectiva',
              sortable: false,
              render: (row) => {
                const rate = row.amountCOP / row.amountUSD
                const delta =
                  row.trmRateSnapshot > 0 ? (rate - row.trmRateSnapshot) / row.trmRateSnapshot : null
                return (
                  <div>
                    <p>{formatCOP(rate)}</p>
                    {delta !== null && (
                      <p className={`text-xs ${delta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {delta >= 0 ? '+' : ''}
                        {(delta * 100).toFixed(1)}% vs. TRM de ese día
                      </p>
                    )}
                  </div>
                )
              },
            },
            {
              key: 'note',
              label: 'Nota',
              sortable: false,
              render: (row) => row.note || '—',
            },
            {
              key: 'actions',
              label: '',
              sortable: false,
              render: (row) => (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DELETE_SOURCE_TRANSFER', payload: row.id })}
                  className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                  aria-label="Eliminar conversión"
                >
                  <Trash2 size={16} />
                </button>
              ),
            },
          ]}
          rows={table.sortedItems}
          sortColumn={table.sortColumn}
          sortDirection={table.sortDirection}
          onSort={table.toggleSort}
          page={table.page}
          totalPages={table.totalPages}
          onPageChange={table.setPage}
          emptyMessage="Aún no has registrado conversiones entre fuentes."
        />
      </div>
    </div>
  )
}
