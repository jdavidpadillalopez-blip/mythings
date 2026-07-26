import { useState } from 'react'
import { Plus, Trash2, Landmark } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatUSD, formatDate } from '../utils/format'
import DataTable from './DataTable'
import IncomeSourceManagerModal from './IncomeSourceManagerModal'
import useSortablePaginatedList from '../hooks/useSortablePaginatedList'

// Income is only ever classified as fijo (predictable, recurring — salary, etc.) or variable
// (one-off — freelance, bonuses, etc.). Unlike expenses, income doesn't use the shared category
// taxonomy (Arriendo/Alimentación/...): those categories describe what money is spent on, which
// doesn't apply to money coming in.
const INCOME_TYPES = [
  { value: 'fijo', label: 'Ingreso fijo' },
  { value: 'variable', label: 'Ingreso variable' },
]

export default function IncomeForm() {
  const { state, dispatch } = useApp()
  const { incomes, trm, incomeSources } = state
  const [description, setDescription] = useState('')
  const [amountUSD, setAmountUSD] = useState('')
  const [tipo, setTipo] = useState('fijo')
  const [source, setSource] = useState(incomeSources[0]?.nombre ?? '')
  const [error, setError] = useState(null)
  const [showSourceManager, setShowSourceManager] = useState(false)

  const table = useSortablePaginatedList(incomes, { defaultSortColumn: 'date', pageSize: 8 })

  function handleSubmit(e) {
    e.preventDefault()
    const amount = Number(amountUSD)
    if (!description.trim()) {
      setError('Escribe una descripción para el ingreso')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('El monto en USD debe ser mayor que 0')
      return
    }

    setError(null)
    dispatch({
      type: 'ADD_INCOME',
      payload: {
        id: crypto.randomUUID(),
        description: description.trim(),
        amountUSD: amount,
        tipo,
        source: source || null,
        date: new Date().toISOString(),
      },
    })
    setDescription('')
    setAmountUSD('')
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
        Ingresos (USD)
      </h2>

      <form onSubmit={handleSubmit} className="mb-1 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Descripción (ej: Salario)"
          className={`flex-1 rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 ${
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
              : 'border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
          }`}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={amountUSD}
          onChange={(e) => {
            setAmountUSD(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Monto USD"
          className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 sm:w-32 ${
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
              : 'border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
          }`}
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 sm:w-40"
        >
          {INCOME_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 sm:w-40"
        >
          {incomeSources.map((s) => (
            <option key={s.id} value={s.nombre}>
              {s.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowSourceManager(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors duration-200 hover:border-slate-500 hover:text-slate-100"
          aria-label="Gestionar fuentes de ingreso"
          title="Gestionar fuentes de ingreso"
        >
          <Landmark size={16} />
        </button>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          <Plus size={16} />
          Agregar
        </button>
      </form>
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      <div className="mt-3">
        <DataTable
          columns={[
            { key: 'date', label: 'Fecha', render: (row) => formatDate(row.date) },
            { key: 'description', label: 'Descripción' },
            { key: 'source', label: 'Fuente', render: (row) => row.source || '—' },
            {
              key: 'tipo',
              label: 'Tipo',
              render: (row) => (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.tipo === 'variable'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  {row.tipo === 'variable' ? 'Variable' : 'Fijo'}
                </span>
              ),
            },
            {
              key: 'amountUSD',
              label: 'Monto',
              render: (row) => (
                <div className="text-right">
                  <p className="font-semibold text-emerald-400">{formatUSD(row.amountUSD)}</p>
                  <p className="text-xs text-slate-500">≈ {formatCOP(row.amountUSD * trm.rate)}</p>
                </div>
              ),
            },
            {
              key: 'actions',
              label: '',
              sortable: false,
              render: (row) => (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DELETE_INCOME', payload: row.id })}
                  className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                  aria-label="Eliminar ingreso"
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
          emptyMessage="Aún no has registrado ingresos."
        />
      </div>

      <IncomeSourceManagerModal open={showSourceManager} onClose={() => setShowSourceManager(false)} />
    </div>
  )
}
