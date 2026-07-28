import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, PiggyBank, TrendingUp, Target, ShieldAlert } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatPercent, formatDate } from '../utils/format'
import PocketDetailModal from './PocketDetailModal'
import SavingsProjectionCard from './SavingsProjectionCard'
import ErrorBoundary from './ErrorBoundary'

export const POCKET_TYPES = {
  ahorro: { label: 'Ahorro', icon: PiggyBank, color: 'emerald' },
  inversion: { label: 'Inversión', icon: TrendingUp, color: 'blue' },
  meta: { label: 'Meta', icon: Target, color: 'amber' },
  fondo_emergencia: { label: 'Fondo de emergencia', icon: ShieldAlert, color: 'red' },
}

// Tailwind's scanner needs full class names written out literally — no `bg-${color}-500` interpolation.
const TYPE_CARD_CLASSES = {
  emerald: 'border-emerald-900/60 text-emerald-400',
  blue: 'border-blue-900/60 text-blue-400',
  amber: 'border-amber-900/60 text-amber-400',
  red: 'border-red-900/60 text-red-400',
}

const TYPE_BAR_CLASSES = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

const emptyForm = { nombre: '', tipo: 'ahorro', valorActual: '', meta: '', vencimiento: '' }

export default function PocketManager() {
  const { state, dispatch } = useApp()
  const { pockets } = state
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const [openPocketId, setOpenPocketId] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    const valorActual = Number(form.valorActual) || 0
    const meta = form.meta ? Number(form.meta) : null

    if (!form.nombre.trim()) {
      setError('Escribe un nombre para el bolsillo')
      return
    }
    if (valorActual < 0) {
      setError('El valor inicial no puede ser negativo')
      return
    }
    if (meta !== null && (!Number.isFinite(meta) || meta <= 0)) {
      setError('La meta debe ser mayor que 0, o déjala vacía')
      return
    }

    setError(null)
    dispatch({
      type: 'ADD_POCKET',
      payload: {
        id: crypto.randomUUID(),
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        valorActual,
        meta,
        vencimiento: form.vencimiento || null,
        historialAportes: [],
      },
    })
    setForm(emptyForm)
  }

  const openPocket = pockets.find((p) => p.id === openPocketId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <ErrorBoundary>
        <SavingsProjectionCard />
      </ErrorBoundary>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          <PiggyBank size={16} />
          Bolsillos (ahorro e inversión)
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => {
              setForm((f) => ({ ...f, nombre: e.target.value }))
              if (error) setError(null)
            }}
            placeholder="Nombre (ej: Vacaciones)"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 sm:col-span-2 lg:col-span-1"
          />
          <select
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          >
            {Object.entries(POCKET_TYPES).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            value={form.valorActual}
            onChange={(e) => {
              setForm((f) => ({ ...f, valorActual: e.target.value }))
              if (error) setError(null)
            }}
            placeholder="Valor inicial COP"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
          <input
            type="number"
            min="0"
            value={form.meta}
            onChange={(e) => {
              setForm((f) => ({ ...f, meta: e.target.value }))
              if (error) setError(null)
            }}
            placeholder="Meta COP (opcional)"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
          <input
            type="date"
            value={form.vencimiento}
            onChange={(e) => setForm((f) => ({ ...f, vencimiento: e.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 sm:col-span-2 lg:col-span-1"
          >
            <Plus size={16} />
            Crear bolsillo
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {pockets.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center text-sm text-slate-500">
          Aún no tienes bolsillos. Crea uno para empezar a apartar dinero con un propósito.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {pockets.map((pocket) => {
              const typeMeta = POCKET_TYPES[pocket.tipo]
              const Icon = typeMeta.icon
              const pct = pocket.meta ? Math.min(1, pocket.valorActual / pocket.meta) : null
              return (
                <motion.div
                  key={pocket.id}
                  role="button"
                  tabIndex={0}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setOpenPocketId(pocket.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenPocketId(pocket.id)
                    }
                  }}
                  className={`flex cursor-pointer flex-col gap-2 rounded-xl border bg-slate-900/60 p-4 text-left transition-colors duration-200 hover:border-slate-600 ${TYPE_CARD_CLASSES[typeMeta.color]}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                      <Icon size={16} />
                      {typeMeta.label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatch({ type: 'DELETE_POCKET', payload: pocket.id })
                      }}
                      className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                      aria-label="Eliminar bolsillo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="font-medium text-slate-100">{pocket.nombre}</p>
                  <p className="text-lg font-bold text-slate-50">{formatCOP(pocket.valorActual)}</p>
                  {pocket.meta && (
                    <div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${TYPE_BAR_CLASSES[typeMeta.color]}`}
                          style={{ width: `${(pct ?? 0) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatPercent(pct ?? 0)} de {formatCOP(pocket.meta)}
                      </p>
                    </div>
                  )}
                  {pocket.vencimiento && (
                    <p className="text-xs text-slate-500">Vence: {formatDate(pocket.vencimiento)}</p>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <PocketDetailModal pocket={openPocket} onClose={() => setOpenPocketId(null)} />
    </div>
  )
}
