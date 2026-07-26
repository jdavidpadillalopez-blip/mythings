import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, Home, UtensilsCrossed, Bus, ShieldCheck, Tag, Tags, ShoppingBag } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatDate } from '../utils/format'
import { getMonthKey } from '../utils/debts'
import { sumDebtPayments } from '../utils/calculations'
import DataTable from './DataTable'
import CategoryManagerModal from './CategoryManagerModal'
import useSortablePaginatedList from '../hooks/useSortablePaginatedList'

const DEFAULT_ICONS = {
  'fixed-arriendo': Home,
  'fixed-alimentacion': UtensilsCrossed,
  'fixed-transporte': Bus,
  'fixed-seguridad-social': ShieldCheck,
}

// Tailwind's scanner needs each full class name written out literally, so the accent
// variants are spelled out per color instead of built from an interpolated string.
const ACCENT_FOCUS_CLASSES = {
  orange: 'border-slate-700 hover:border-slate-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30',
  amber: 'border-slate-700 hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30',
}

const fieldClass = (invalid, accent) =>
  `rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 ${
    invalid ? 'border-red-500 focus:ring-2 focus:ring-red-500/30' : ACCENT_FOCUS_CLASSES[accent]
  }`

export function FixedExpenses() {
  const { state, dispatch } = useApp()
  const { fixedExpenses, debts } = state
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)

  function handleAmountChange(id, value) {
    dispatch({ type: 'UPDATE_FIXED_EXPENSE', payload: { id, changes: { amount: Number(value) || 0 } } })
  }

  function handleAddCustom(e) {
    e.preventDefault()
    const value = Number(amount)
    if (!name.trim()) {
      setError('Escribe un nombre para el gasto fijo')
      return
    }
    if (!Number.isFinite(value) || value < 0) {
      setError('El monto debe ser 0 o mayor')
      return
    }
    setError(null)
    dispatch({
      type: 'ADD_FIXED_EXPENSE',
      payload: { id: crypto.randomUUID(), name: name.trim(), amount: value, isDefault: false },
    })
    setName('')
    setAmount('')
  }

  const monthKey = getMonthKey(new Date())
  const activeDebts = debts.filter((debt) => debt.estadoGeneral !== 'completada')
  const totalDebtCOP = sumDebtPayments(debts, monthKey)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-orange-400">
        Gastos fijos (COP)
      </h2>

      <ul className="mb-3 flex flex-col gap-2">
        {fixedExpenses.map((expense) => {
          const Icon = DEFAULT_ICONS[expense.id] ?? Tag
          return (
            <li
              key={expense.id}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm transition-colors duration-200"
            >
              <Icon size={16} className="shrink-0 text-orange-400" />
              <span className="flex-1 font-medium text-slate-100">{expense.name}</span>
              <input
                type="number"
                min="0"
                value={expense.amount || ''}
                onChange={(e) => handleAmountChange(expense.id, e.target.value)}
                placeholder="0"
                className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-right text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
              {!expense.isDefault && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DELETE_FIXED_EXPENSE', payload: expense.id })}
                  className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                  aria-label="Eliminar gasto fijo"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          )
        })}

        <AnimatePresence initial={false}>
          {activeDebts.map((debt) => {
            const cuota = debt.cuotas.find((item) => item.mes === monthKey)
            return (
              <motion.li
                key={debt.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 overflow-hidden rounded-lg border border-dashed border-red-900/60 bg-red-950/20 px-3 py-2 text-sm"
              >
                <Tag size={16} className="shrink-0 text-red-400" />
                <span className="flex-1 font-medium text-slate-100">
                  {debt.nombre}{' '}
                  <span className="text-xs text-slate-500">
                    {cuota ? `(cuota ${cuota.numero}/${debt.numeroCuotasTotal})` : '(sin cuota este mes)'}
                  </span>
                </span>
                <span className="w-32 text-right font-semibold text-red-400">
                  {formatCOP(cuota?.montoEsperado ?? 0)}
                </span>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      <form onSubmit={handleAddCustom} className="flex flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Otro gasto fijo (ej: Internet)"
          className={`flex-1 ${fieldClass(!!error, 'orange')}`}
        />
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Monto COP"
          className={`w-full sm:w-36 ${fieldClass(!!error, 'orange')}`}
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-orange-500"
        >
          <Plus size={16} />
          Agregar
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <p className="mt-3 text-xs text-slate-500">
        Incluye {formatCOP(totalDebtCOP)} en cuotas de deuda integradas automáticamente.
      </p>
    </div>
  )
}

export function VariableExpenses() {
  const { state, dispatch } = useApp()
  const { variableExpenses, categories } = state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoria, setCategoria] = useState(categories[0]?.nombre ?? '')
  const [error, setError] = useState(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  const table = useSortablePaginatedList(variableExpenses, { defaultSortColumn: 'date', pageSize: 6 })

  function handleSubmit(e) {
    e.preventDefault()
    const value = Number(amount)
    if (!description.trim()) {
      setError('Escribe una descripción para el gasto')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('El monto debe ser mayor que 0')
      return
    }
    setError(null)
    dispatch({
      type: 'ADD_VARIABLE_EXPENSE',
      payload: {
        id: crypto.randomUUID(),
        description: description.trim(),
        amount: value,
        categoria: categoria || null,
        date: new Date().toISOString(),
      },
    })
    setDescription('')
    setAmount('')
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-400">
        <ShoppingBag size={16} />
        Gastos variables (COP)
      </h2>

      <form onSubmit={handleSubmit} className="mb-1 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Descripción (ej: Salida a cine)"
          className={`flex-1 ${fieldClass(!!error, 'amber')}`}
        />
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Monto COP"
          className={`w-full sm:w-32 ${fieldClass(!!error, 'amber')}`}
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className={`sm:w-40 ${fieldClass(false, 'amber')}`}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowCategoryManager(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors duration-200 hover:border-slate-500 hover:text-slate-100"
          aria-label="Gestionar categorías"
          title="Gestionar categorías"
        >
          <Tags size={16} />
        </button>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-amber-500"
        >
          <Plus size={16} />
          Agregar
        </button>
      </form>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3">
        <DataTable
          columns={[
            { key: 'date', label: 'Fecha', render: (row) => formatDate(row.date) },
            { key: 'description', label: 'Descripción' },
            { key: 'categoria', label: 'Categoría', render: (row) => row.categoria || '—' },
            {
              key: 'amount',
              label: 'Monto',
              render: (row) => <span className="font-semibold text-amber-400">{formatCOP(row.amount)}</span>,
            },
            {
              key: 'actions',
              label: '',
              sortable: false,
              render: (row) => (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DELETE_VARIABLE_EXPENSE', payload: row.id })}
                  className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                  aria-label="Eliminar gasto variable"
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
          emptyMessage="No tienes gastos variables registrados."
        />
      </div>

      <CategoryManagerModal open={showCategoryManager} onClose={() => setShowCategoryManager(false)} />
    </div>
  )
}

export default function ExpenseForm() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <FixedExpenses />
      <VariableExpenses />
    </div>
  )
}
