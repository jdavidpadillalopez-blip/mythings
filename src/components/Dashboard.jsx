import { PiggyBank } from 'lucide-react'
import useFinanceSummary from '../hooks/useFinanceSummary'
import { useApp } from '../context/AppContext'
import { formatCOP } from '../utils/format'
import SummaryCards from './SummaryCards'
import ExpenseChart from './ExpenseChart'
import MoneyFlowSankey from './MoneyFlowSankey'

export default function Dashboard() {
  const totals = useFinanceSummary()
  const { state } = useApp()
  const totalPockets = state.pockets.reduce((sum, pocket) => sum + pocket.valorActual, 0)

  return (
    <div className="flex flex-col gap-4">
      <SummaryCards totals={totals} />

      {state.pockets.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-900/60 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <PiggyBank size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">Total en bolsillos</span>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-50">{formatCOP(totalPockets)}</p>
            <p className="text-xs text-slate-500">
              {state.pockets.length} bolsillo{state.pockets.length > 1 ? 's' : ''} · ahorro, no gasto
            </p>
          </div>
        </div>
      )}

      <ExpenseChart totals={totals} />
      <MoneyFlowSankey />
    </div>
  )
}
