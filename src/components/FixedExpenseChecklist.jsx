import { CheckCircle2, Circle, ListChecks } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatUSD } from '../utils/format'
import { getMonthKey } from '../utils/debts'

function formatByCurrency(expense) {
  return expense.currency === 'USD' ? formatUSD(expense.amount) : formatCOP(expense.amount)
}

// Fixed expenses (Arriendo, Alimentación, etc.) are a flat list with no per-month instance of their
// own — unlike debt cuotas or recurring transactions, there's nothing to generate each month. So
// "confirmed for this month" is looked up as a sparse presence record in fixedExpensePayments rather
// than a flag on the expense itself (see TOGGLE_FIXED_EXPENSE_PAID in AppContext.jsx).
export default function FixedExpenseChecklist() {
  const { state, dispatch } = useApp()

  const monthKey = getMonthKey(new Date())
  const items = state.fixedExpenses

  function isPaid(expenseId) {
    return state.fixedExpensePayments.some(
      (p) => p.fixedExpenseId === expenseId && p.monthKey === monthKey,
    )
  }

  const confirmedCount = items.filter((expense) => isPaid(expense.id)).length
  const progress = items.length > 0 ? confirmedCount / items.length : 0

  function toggle(expense) {
    dispatch({ type: 'TOGGLE_FIXED_EXPENSE_PAID', payload: { fixedExpenseId: expense.id, monthKey } })
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-orange-400">
        <ListChecks size={16} />
        Confirmación de gastos fijos —{' '}
        {new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date())}
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Marca cada gasto fijo en cuanto lo pagues este mes — es solo un seguimiento tuyo, no cambia
        los totales del mes ni el monto configurado abajo.
      </p>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No tienes gastos fijos configurados todavía.</p>
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
            {items.map((expense) => {
              const paid = isPaid(expense.id)
              return (
                <li
                  key={expense.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors duration-200 ${
                    paid ? 'border-emerald-900/60 bg-emerald-950/20' : 'border-slate-800 bg-slate-950/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(expense)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    {paid ? (
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                    ) : (
                      <Circle size={18} className="shrink-0 text-slate-600" />
                    )}
                    <span className={`font-medium ${paid ? 'text-slate-300 line-through' : 'text-slate-100'}`}>
                      {expense.name}
                    </span>
                  </button>
                  <span className={`font-medium ${paid ? 'text-slate-400' : 'text-slate-100'}`}>
                    {formatByCurrency(expense)}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
