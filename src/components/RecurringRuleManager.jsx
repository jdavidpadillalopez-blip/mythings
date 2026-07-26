import { useState } from 'react'
import { Plus, Trash2, Pause, Play, Repeat, Tags } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatUSD, formatDate } from '../utils/format'
import { todayISODate } from '../utils/debts'
import CategoryManagerModal from './CategoryManagerModal'

const TIPOS = [
  { value: 'ingreso', label: 'Ingreso (USD)' },
  { value: 'gasto_fijo', label: 'Gasto fijo (COP)' },
  { value: 'gasto_variable', label: 'Gasto variable (COP)' },
]

const FRECUENCIAS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
]

const emptyForm = {
  tipo: 'gasto_variable',
  concepto: '',
  categoria: '',
  monto: '',
  frecuencia: 'mensual',
  diaReferencia: '1',
  fechaDesde: todayISODate(),
  fechaHasta: '',
}

const fieldClass =
  'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30'

export default function RecurringRuleManager() {
  const { state, dispatch } = useApp()
  const { recurringRules, recurringTransactions, categories } = state
  const [form, setForm] = useState({ ...emptyForm, categoria: categories[0]?.nombre ?? '' })
  const [error, setError] = useState(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const monto = Number(form.monto)
    const diaReferencia = Number(form.diaReferencia)

    if (!form.concepto.trim()) {
      setError('Escribe un concepto para la regla')
      return
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      setError('El monto debe ser mayor que 0')
      return
    }
    if (!Number.isInteger(diaReferencia) || diaReferencia < 1 || diaReferencia > 31) {
      setError('El día de referencia debe estar entre 1 y 31')
      return
    }
    if (!form.fechaDesde) {
      setError('Selecciona una fecha de inicio')
      return
    }

    setError(null)
    dispatch({
      type: 'ADD_RECURRING_RULE',
      payload: {
        id: crypto.randomUUID(),
        tipo: form.tipo,
        concepto: form.concepto.trim(),
        categoria: form.categoria,
        monto,
        frecuencia: form.frecuencia,
        diaReferencia,
        fechaDesde: form.fechaDesde,
        fechaHasta: form.fechaHasta || null,
        bolsilloId: null,
        pausada: false,
      },
    })
    setForm({ ...emptyForm, categoria: categories[0]?.nombre ?? '' })
  }

  function countOccurrences(ruleId) {
    return recurringTransactions.filter((tx) => tx.origenReglaId === ruleId).length
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-400">
        <Repeat size={16} />
        Transacciones recurrentes
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Define una regla una sola vez y el sistema generará automáticamente las transacciones futuras
        hasta hoy, sin duplicarlas.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={form.tipo}
          onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
          className={fieldClass}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={form.concepto}
          onChange={(e) => {
            setForm((f) => ({ ...f, concepto: e.target.value }))
            if (error) setError(null)
          }}
          placeholder="Concepto (ej: Netflix)"
          className={fieldClass}
        />
        <div className="flex gap-2">
          <select
            value={form.categoria}
            onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
            className={`flex-1 ${fieldClass}`}
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
            className="shrink-0 rounded-lg border border-slate-700 px-2 text-slate-300 transition-colors duration-200 hover:border-slate-500 hover:text-slate-100"
            aria-label="Gestionar categorías"
            title="Gestionar categorías"
          >
            <Tags size={16} />
          </button>
        </div>
        <input
          type="number"
          min="0"
          value={form.monto}
          onChange={(e) => {
            setForm((f) => ({ ...f, monto: e.target.value }))
            if (error) setError(null)
          }}
          placeholder={form.tipo === 'ingreso' ? 'Monto USD' : 'Monto COP'}
          className={fieldClass}
        />
        <select
          value={form.frecuencia}
          onChange={(e) => setForm((f) => ({ ...f, frecuencia: e.target.value }))}
          className={fieldClass}
        >
          {FRECUENCIAS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max="31"
          value={form.diaReferencia}
          onChange={(e) => setForm((f) => ({ ...f, diaReferencia: e.target.value }))}
          placeholder="Día (1-31)"
          title="Día del mes en que ocurre (frecuencia mensual) o punto de referencia"
          className={fieldClass}
        />
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Desde</label>
          <input
            type="date"
            value={form.fechaDesde}
            onChange={(e) => setForm((f) => ({ ...f, fechaDesde: e.target.value }))}
            className={`w-full ${fieldClass}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
            Hasta (opcional)
          </label>
          <input
            type="date"
            value={form.fechaHasta}
            onChange={(e) => setForm((f) => ({ ...f, fechaHasta: e.target.value }))}
            className={`w-full ${fieldClass}`}
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 self-end rounded-lg bg-violet-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-violet-500 sm:col-span-2 lg:col-span-4"
        >
          <Plus size={16} />
          Crear regla recurrente
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {recurringRules.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No tienes reglas recurrentes configuradas.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-3">
          {recurringRules.map((rule) => (
            <li
              key={rule.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                rule.pausada ? 'border-slate-800 bg-slate-950/40 opacity-60' : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <div>
                <p className="font-medium text-slate-100">
                  {rule.concepto} <span className="text-xs text-slate-500">({rule.categoria})</span>
                </p>
                <p className="text-xs text-slate-500">
                  {TIPOS.find((t) => t.value === rule.tipo)?.label} ·{' '}
                  {FRECUENCIAS.find((f) => f.value === rule.frecuencia)?.label} ·{' '}
                  {rule.tipo === 'ingreso' ? formatUSD(rule.monto) : formatCOP(rule.monto)} · desde{' '}
                  {formatDate(rule.fechaDesde)}
                  {rule.fechaHasta ? ` hasta ${formatDate(rule.fechaHasta)}` : ''}
                </p>
                <p className="text-xs text-slate-600">{countOccurrences(rule.id)} transacciones generadas</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_RECURRING_RULE',
                      payload: { id: rule.id, changes: { pausada: !rule.pausada } },
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors duration-200 hover:border-slate-500"
                >
                  {rule.pausada ? <Play size={12} /> : <Pause size={12} />}
                  {rule.pausada ? 'Reanudar' : 'Pausar'}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DELETE_RECURRING_RULE', payload: rule.id })}
                  className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                  aria-label="Eliminar regla"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoryManagerModal open={showCategoryManager} onClose={() => setShowCategoryManager(false)} />
    </div>
  )
}
