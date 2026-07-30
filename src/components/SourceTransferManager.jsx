import { useState } from 'react'
import { ArrowRightLeft, Trash2, Pencil, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatUSD, formatDate } from '../utils/format'
import DataTable from './DataTable'
import useSortablePaginatedList from '../hooks/useSortablePaginatedList'

function todayISODate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// A fee can be quoted in either currency depending on where the platform takes it (e.g. Deel
// deducts USD fees before converting, but some platforms charge a flat COP fee on arrival) — this
// converts either shape to COP using whatever rate is most specific to this transfer: the rate the
// user declared was applied (appliedRate), falling back to the TRM snapshot taken when the transfer
// was registered, falling back to the live TRM passed in.
export function feeToCOP(transfer, fallbackTrmRate = 0) {
  const fee = transfer?.fee
  const amount = Number(fee?.amount || 0)
  if (!fee || !Number.isFinite(amount) || amount <= 0) return 0
  if (fee.currency === 'USD') {
    const rate = Number(transfer.appliedRate || transfer.trmRateSnapshot || fallbackTrmRate || 0)
    return amount * rate
  }
  return amount
}

/**
 * Tracks internal conversions of money already registered as income — e.g. withdrawing $100 USD
 * from a Deel balance as physical cash. This is deliberately NOT another income entry: the money
 * was already counted once in IncomeForm, so re-adding it here would double the totals. It's a
 * side ledger that answers "where did my Deel income actually end up, and at what real rate" —
 * useful because a cash-out rate is rarely identical to the TRM (state.trm.rate) used elsewhere.
 *
 * TRM aplicada and fee are separate, optional fields precisely so a conversion can show its two
 * distinct sources of "loss" apart instead of buried in one back-calculated rate: the exchange rate
 * the platform actually applied (appliedRate) versus a flat fee it charged on top (fee). Without
 * them, all you can see is a single blended "tasa efectiva" that mixes both together.
 */
export default function SourceTransferManager() {
  const { state, dispatch } = useApp()
  const { incomeSources, sourceTransfers, trm } = state

  const [fromSource, setFromSource] = useState(incomeSources[0]?.nombre ?? '')
  const [toSource, setToSource] = useState(incomeSources[1]?.nombre ?? incomeSources[0]?.nombre ?? '')
  const [amountUSD, setAmountUSD] = useState('')
  const [amountCOP, setAmountCOP] = useState('')
  const [appliedRate, setAppliedRate] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [feeCurrency, setFeeCurrency] = useState('USD')
  const [date, setDate] = useState(todayISODate())
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  // Non-null while editing an existing entry (see startEdit/cancelEdit below) — the form fields
  // above are reused for both add and edit so there's only one set of inputs to keep in sync.
  const [editingId, setEditingId] = useState(null)
  const [editingTrmSnapshot, setEditingTrmSnapshot] = useState(null)

  const table = useSortablePaginatedList(sourceTransfers, { defaultSortColumn: 'date', pageSize: 8 })

  const parsedUSD = Number(amountUSD)
  const parsedCOP = Number(amountCOP)
  const parsedAppliedRate = Number(appliedRate)
  const parsedFeeAmount = Number(feeAmount)
  const canPreview = Number.isFinite(parsedUSD) && parsedUSD > 0 && Number.isFinite(parsedCOP) && parsedCOP > 0
  const previewRate = canPreview ? parsedCOP / parsedUSD : null
  const trmRate = Number(trm?.rate || 0)
  const previewDeltaPct = previewRate && trmRate > 0 ? (previewRate - trmRate) / trmRate : null
  const previewFeeCOP =
    Number.isFinite(parsedFeeAmount) && parsedFeeAmount > 0
      ? feeToCOP(
          { fee: { amount: parsedFeeAmount, currency: feeCurrency }, appliedRate: parsedAppliedRate },
          trmRate,
        )
      : 0

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
    const fee =
      Number.isFinite(parsedFeeAmount) && parsedFeeAmount > 0
        ? { amount: parsedFeeAmount, currency: feeCurrency }
        : null
    const appliedRateValue =
      Number.isFinite(parsedAppliedRate) && parsedAppliedRate > 0 ? parsedAppliedRate : null

    if (editingId) {
      dispatch({
        type: 'UPDATE_SOURCE_TRANSFER',
        payload: {
          id: editingId,
          fromSource,
          toSource,
          amountUSD: parsedUSD,
          amountCOP: parsedCOP,
          // The original TRM-of-the-day snapshot is preserved rather than replaced with today's
          // live rate — it documents what the official TRM was when the conversion happened, which
          // an edit made later (e.g. filling in the fee) shouldn't retroactively change.
          trmRateSnapshot: editingTrmSnapshot,
          appliedRate: appliedRateValue,
          fee,
          date,
          note: note.trim() || null,
        },
      })
      cancelEdit()
      return
    }

    dispatch({
      type: 'ADD_SOURCE_TRANSFER',
      payload: {
        id: crypto.randomUUID(),
        fromSource,
        toSource,
        amountUSD: parsedUSD,
        amountCOP: parsedCOP,
        trmRateSnapshot: trmRate,
        appliedRate: appliedRateValue,
        fee,
        date,
        note: note.trim() || null,
      },
    })
    setAmountUSD('')
    setAmountCOP('')
    setAppliedRate('')
    setFeeAmount('')
    setNote('')
  }

  function startEdit(row) {
    setEditingId(row.id)
    setEditingTrmSnapshot(row.trmRateSnapshot ?? null)
    setFromSource(row.fromSource)
    setToSource(row.toSource)
    setAmountUSD(String(row.amountUSD ?? ''))
    setAmountCOP(String(row.amountCOP ?? ''))
    setAppliedRate(row.appliedRate ? String(row.appliedRate) : '')
    setFeeAmount(row.fee?.amount ? String(row.fee.amount) : '')
    setFeeCurrency(row.fee?.currency ?? 'USD')
    setDate(row.date)
    setNote(row.note ?? '')
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTrmSnapshot(null)
    setFromSource(incomeSources[0]?.nombre ?? '')
    setToSource(incomeSources[1]?.nombre ?? incomeSources[0]?.nombre ?? '')
    setAmountUSD('')
    setAmountCOP('')
    setAppliedRate('')
    setFeeAmount('')
    setFeeCurrency('USD')
    setDate(todayISODate())
    setNote('')
    setError(null)
  }

  const inputClass = (hasError) =>
    `rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 ${
      hasError
        ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
        : 'border-slate-700 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
    }`

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-400">
        <ArrowRightLeft size={16} />
        Conversión entre fuentes
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Para cuando pasas dinero ya registrado como ingreso de una fuente a otra — por ejemplo, retirar
        USD de Deel como efectivo. Esto no suma un ingreso nuevo, solo deja constancia de a qué tasa
        real se hizo el cambio. Indica la TRM que te aplicaron y el fee cobrado por separado para que
        quede claro de dónde sale la diferencia frente a la TRM oficial.
      </p>

      {editingId && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-600/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          <span>Editando una conversión ya registrada.</span>
          <button
            type="button"
            onClick={cancelEdit}
            className="inline-flex items-center gap-1 text-amber-200 transition-colors duration-200 hover:text-amber-100"
          >
            <X size={12} />
            Cancelar
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
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
          className={inputClass(Boolean(error))}
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
          className={inputClass(Boolean(error))}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={appliedRate}
          onChange={(e) => setAppliedRate(e.target.value)}
          placeholder="TRM aplicada (opcional)"
          title="La tasa COP/USD que el proveedor dice haber usado para esta conversión"
          className={inputClass(false)}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
        />

        <div className="flex gap-2 sm:col-span-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            placeholder="Fee cobrado (opcional)"
            title="Lo que te cobró el proveedor por hacer la conversión, aparte de la tasa"
            className={`flex-1 ${inputClass(false)}`}
          />
          <select
            value={feeCurrency}
            onChange={(e) => setFeeCurrency(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
          >
            <option value="USD">USD</option>
            <option value="COP">COP</option>
          </select>
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 sm:col-span-2"
        />
        <button
          type="submit"
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors duration-200 sm:col-span-2 lg:col-span-2 ${
            editingId ? 'bg-amber-600/90 hover:bg-amber-500' : 'bg-cyan-600/90 hover:bg-cyan-500'
          }`}
        >
          <ArrowRightLeft size={16} />
          {editingId ? 'Guardar cambios' : 'Registrar conversión'}
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {canPreview && (
        <p className="mt-2 text-xs text-slate-400">
          Tasa neta recibida: <span className="font-semibold text-slate-200">{formatCOP(previewRate)}</span> por
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
          {previewFeeCOP > 0 && (
            <>
              {' '}
              · Fee: <span className="font-semibold text-amber-400">{formatCOP(previewFeeCOP)}</span>
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
              key: 'appliedRate',
              label: 'TRM aplicada',
              sortable: false,
              render: (row) => (row.appliedRate ? formatCOP(row.appliedRate) : '—'),
            },
            {
              key: 'fee',
              label: 'Fee',
              sortable: false,
              render: (row) =>
                row.fee
                  ? `${row.fee.currency === 'USD' ? formatUSD(row.fee.amount) : formatCOP(row.fee.amount)} (${formatCOP(feeToCOP(row, row.trmRateSnapshot))})`
                  : '—',
            },
            {
              key: 'tasa',
              label: 'Tasa neta',
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                    className="text-slate-500 transition-colors duration-200 hover:text-cyan-400"
                    aria-label="Editar conversión"
                    title="Editar esta conversión"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingId === row.id) cancelEdit()
                      dispatch({ type: 'DELETE_SOURCE_TRANSFER', payload: row.id })
                    }}
                    className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                    aria-label="Eliminar conversión"
                    title="Eliminar esta conversión"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
