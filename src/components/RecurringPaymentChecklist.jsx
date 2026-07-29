import { CheckCircle2, Circle, ListChecks } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatUSD, formatDate } from '../utils/format'
import { getMonthKey } from '../utils/debts'

const TIPO_LABELS = {
  ingreso: 'Ingreso',
  gasto_fijo: 'Gasto fijo',
  gasto_variable: 'Gasto variable',
}

export default function RecurringPaymentChecklist() {
  const { state, dispatch } = useApp()

  const monthKey = getMonthKey(new Date())
  const items = state.recurringTransactions
    .filter((tx) => tx.fecha.slice(0, 7) === monthKey)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const confirmedCount = items.filter((tx) => tx.pagada).length
  const progress = items.length > 0 ? confirmedCount / items.length : 0

  function toggle(tx) {
    dispatch({ type: 'TOGGLE_RECURRING_TRANSACTION_PAID', payload: tx.id })
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-400">
        <ListChecks size={16} />
        Confirmación de pagos recurrentes — {new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date())}
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Marca cada transacción recurrente de este mes como confirmada en cuanto la pagues (o la
        recibas, si es un ingreso) — es solo un seguimiento tuyo, no cambia los totales del mes.
      </p>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          No hay transacciones recurrentes generadas para este mes todavía.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-slate-400">
              {confirmedCount} de {items.length} confirmados
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {items.map((tx) => (
              <li
                key={tx.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors duration-200 ${
                  tx.pagada ? 'border-emerald-900/60 bg-emerald-950/20' : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(tx)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {tx.pagada ? (
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                  ) : (
                    <Circle size={18} className="shrink-0 text-slate-600" />
                  )}
                  <span>
                    <span className={`font-medium ${tx.pagada ? 'text-slate-300 line-through' : 'text-slate-100'}`}>
                      {tx.concepto}
                    </span>{' '}
                    <span className="text-xs text-slate-500">
                      ({TIPO_LABELS[tx.tipo]} · {formatDate(tx.fecha)})
                    </span>
                  </span>
                </button>
                <span className={`font-medium ${tx.pagada ? 'text-slate-400' : 'text-slate-100'}`}>
                  {tx.tipo === 'ingreso' ? formatUSD(tx.monto) : formatCOP(tx.monto)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
