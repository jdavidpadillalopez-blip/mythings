import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, Pencil, X, CreditCard, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP } from '../utils/format'
import { buildDebtFromForm, todayISODate } from '../utils/debts'
import { deleteProofsForDebt } from '../utils/proofStorage'
import DebtInstallmentTracker from './DebtInstallmentTracker'
import DebtPayoffRoadmap from './DebtPayoffRoadmap'
import DebtProgressOverview from './DebtProgressOverview'

const emptyForm = { nombre: '', montoTotal: '', numeroCuotasTotal: '', fechaInicio: todayISODate() }

const fieldClass = (invalid) =>
  `rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 ${
    invalid
      ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
      : 'border-slate-700 hover:border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
  }`

export default function DebtManager() {
  const { state, dispatch } = useApp()
  const { debts } = state

  const [form, setForm] = useState(emptyForm)
  const [cuotaManual, setCuotaManual] = useState('')
  const [manualCuota, setManualCuota] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)

  const montoTotalNum = Number(form.montoTotal)
  const numeroCuotasNum = Number(form.numeroCuotasTotal)
  const cuotaManualNum = Number(cuotaManual)

  // Live preview: normally cuotaMensual = montoTotal / numeroCuotasTotal. If the user overrides the
  // cuota field directly, the number of installments is recalculated instead (ceil, so the last
  // installment absorbs whatever remainder is smaller than a full cuota) — montoTotal always wins.
  const cuotaMensualPreview =
    manualCuota && cuotaManualNum > 0
      ? cuotaManualNum
      : montoTotalNum > 0 && numeroCuotasNum > 0
        ? montoTotalNum / numeroCuotasNum
        : 0

  const numeroCuotasEfectivo =
    manualCuota && cuotaManualNum > 0 && montoTotalNum > 0
      ? Math.ceil(montoTotalNum / cuotaManualNum)
      : numeroCuotasNum

  function resetForm() {
    setForm(emptyForm)
    setCuotaManual('')
    setManualCuota(false)
    setEditingId(null)
    setError(null)
  }

  function startEdit(debt) {
    setEditingId(debt.id)
    setForm({
      nombre: debt.nombre,
      montoTotal: String(debt.montoTotal),
      numeroCuotasTotal: String(debt.numeroCuotasTotal),
      fechaInicio: debt.fechaInicio,
    })
    setCuotaManual('')
    setManualCuota(false)
    setError(null)
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!form.nombre.trim()) {
      setError('Escribe un nombre para la deuda')
      return
    }
    if (!Number.isFinite(montoTotalNum) || montoTotalNum <= 0) {
      setError('El monto total debe ser mayor que 0')
      return
    }
    if (!Number.isInteger(numeroCuotasEfectivo) || numeroCuotasEfectivo <= 0) {
      setError('El número de cuotas debe ser un entero mayor que 0')
      return
    }
    if (!form.fechaInicio || Number.isNaN(new Date(`${form.fechaInicio}T00:00:00`).getTime())) {
      setError('Selecciona una fecha de inicio válida')
      return
    }

    const params = {
      nombre: form.nombre,
      montoTotal: montoTotalNum,
      cuotaMensual: cuotaMensualPreview,
      numeroCuotasTotal: numeroCuotasEfectivo,
      fechaInicio: form.fechaInicio,
    }

    if (editingId) {
      const existing = debts.find((debt) => debt.id === editingId)
      const paramsChanged =
        existing.montoTotal !== Math.round(params.montoTotal) ||
        existing.numeroCuotasTotal !== params.numeroCuotasTotal ||
        existing.cuotaMensual !== Math.round(params.cuotaMensual) ||
        existing.fechaInicio !== params.fechaInicio
      const hasPaidInstallments = existing.cuotas.some((cuota) => cuota.estado === 'pagada')

      if (paramsChanged && hasPaidInstallments) {
        const confirmed = window.confirm(
          `"${existing.nombre}" ya tiene cuotas marcadas como pagadas. Cambiar el monto, número de cuotas o fecha de inicio regenerará todo el plan de pagos y perderás ese registro. ¿Deseas continuar?`,
        )
        if (!confirmed) return
      }

      const changes = paramsChanged
        ? buildDebtFromForm(params, editingId)
        : { ...existing, nombre: params.nombre.trim() }
      dispatch({ type: 'UPDATE_DEBT', payload: { id: editingId, changes } })
    } else {
      dispatch({ type: 'ADD_DEBT', payload: buildDebtFromForm(params) })
    }

    resetForm()
  }

  function handleDeleteDebt(debt) {
    deleteProofsForDebt(debt)
    dispatch({ type: 'DELETE_DEBT', payload: debt.id })
  }

  const activeDebts = debts.filter((debt) => debt.estadoGeneral !== 'completada')
  const completedDebts = debts.filter((debt) => debt.estadoGeneral === 'completada')
  const migratedDebts = debts.filter((debt) => debt.migratedFromLegacy)

  return (
    <div className="flex flex-col gap-4">
      {migratedDebts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          <span>
            Migramos {migratedDebts.length} deuda{migratedDebts.length > 1 ? 's' : ''} al nuevo formato de
            cuotas con un plan de 12 meses empezando este mes. Revisa y ajusta el número de cuotas y la
            fecha de inicio de cada una si no corresponden.
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'ACK_DEBT_MIGRATION' })}
            className="shrink-0 font-medium underline decoration-dotted underline-offset-2 hover:text-amber-200"
          >
            Entendido
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-400">
            <CreditCard size={16} />
            {editingId ? 'Editar deuda' : 'Deudas (plan de pagos)'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
            >
              <X size={14} />
              Cancelar edición
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => {
              setForm((f) => ({ ...f, nombre: e.target.value }))
              if (error) setError(null)
            }}
            placeholder="Nombre (ej: Tarjeta Bancolombia)"
            className={`${fieldClass(!!error)} sm:col-span-2 lg:col-span-1`}
          />
          <input
            type="number"
            min="0"
            value={form.montoTotal}
            onChange={(e) => {
              setForm((f) => ({ ...f, montoTotal: e.target.value }))
              if (error) setError(null)
            }}
            placeholder="Monto total COP"
            className={fieldClass(!!error)}
          />
          <input
            type="number"
            min="1"
            step="1"
            value={form.numeroCuotasTotal}
            onChange={(e) => {
              setForm((f) => ({ ...f, numeroCuotasTotal: e.target.value }))
              setManualCuota(false)
              if (error) setError(null)
            }}
            placeholder="N.º de cuotas"
            className={fieldClass(!!error)}
          />
          <input
            type="date"
            value={form.fechaInicio}
            onChange={(e) => {
              setForm((f) => ({ ...f, fechaInicio: e.target.value }))
              if (error) setError(null)
            }}
            className={fieldClass(!!error)}
          />

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs text-slate-500">
              Cuota mensual estimada (editable — fijarla recalcula el número de cuotas)
            </label>
            <input
              type="number"
              min="0"
              value={manualCuota ? cuotaManual : cuotaMensualPreview ? Math.round(cuotaMensualPreview) : ''}
              onChange={(e) => {
                setManualCuota(true)
                setCuotaManual(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Cuota mensual COP"
              className={fieldClass(!!error)}
            />
            {numeroCuotasEfectivo > 0 && cuotaMensualPreview > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {numeroCuotasEfectivo} cuotas de {formatCOP(cuotaMensualPreview)}
                {manualCuota ? ' (número de cuotas recalculado)' : ''}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 self-end rounded-lg bg-red-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-500 sm:col-span-2 lg:col-span-1"
          >
            <Plus size={16} />
            {editingId ? 'Guardar cambios' : 'Registrar deuda'}
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      <DebtProgressOverview />

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">Deudas activas</h3>
        {activeDebts.length === 0 ? (
          <p className="text-sm text-slate-500">No tienes deudas activas.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {activeDebts.map((debt) => (
                <motion.li
                  key={debt.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-100">{debt.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {formatCOP(debt.montoTotal)} · {formatCOP(debt.cuotaMensual)}/mes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(debt)}
                        className="text-slate-500 transition-colors duration-200 hover:text-slate-200"
                        aria-label="Editar deuda"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDebt(debt)}
                        className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                        aria-label="Eliminar deuda"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <DebtInstallmentTracker debt={debt} />
                  <DebtPayoffRoadmap debt={debt} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {completedDebts.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
            Deudas completadas
          </h3>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {completedDebts.map((debt) => (
                <motion.li
                  key={debt.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between overflow-hidden rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-medium text-slate-100">{debt.nombre}</p>
                      <p className="text-xs text-emerald-400">✅ Deuda saldada · {formatCOP(debt.montoTotal)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDebt(debt)}
                    className="text-slate-500 transition-colors duration-200 hover:text-red-400"
                    aria-label="Eliminar deuda"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  )
}
