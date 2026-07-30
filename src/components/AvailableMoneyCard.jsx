import { Landmark } from 'lucide-react'
import { useApp } from '../context/AppContext'
import useFinanceSummary from '../hooks/useFinanceSummary'
import useExecutionSummary from '../hooks/useExecutionSummary'
import { formatUSD, formatCOP } from '../utils/format'

// Distinct from "Flujo de caja libre" in SummaryCards, which is a *projection*: it assumes every
// fixed expense, debt cuota and recurring transaction for the month will get paid. This card is the
// opposite — it only counts money that has actually left your hands (ejecutado.total, plus variable
// expenses which are logged at the moment they happen and so are always "executed" by construction),
// giving a real, present-tense answer to "how much do I actually still have available right now."
export default function AvailableMoneyCard() {
  const { state } = useApp()
  const { totalIncomeUSD, totalVariableCOP } = useFinanceSummary()
  const { proyectado, ejecutado } = useExecutionSummary()
  const trmRate = Number(state.trm.rate || 0)

  const executedSpendCOP = ejecutado.total + totalVariableCOP
  const executedSpendUSD = trmRate > 0 ? executedSpendCOP / trmRate : 0
  const availableUSD = totalIncomeUSD - executedSpendUSD
  const availableCOP = availableUSD * trmRate

  const pendingCOP = Math.max(proyectado.total - ejecutado.total, 0)
  const pendingUSD = trmRate > 0 ? pendingCOP / trmRate : 0

  const isPositive = availableUSD >= 0

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 bg-slate-900/60 ${
        isPositive ? 'border-emerald-900/60' : 'border-red-900/60'
      }`}
    >
      <div className={`flex items-center gap-2 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        <Landmark size={18} />
        <span className="text-xs font-semibold uppercase tracking-wide">Dinero disponible (según lo ejecutado)</span>
      </div>
      <div className="text-right">
        <p className={`text-xl font-bold ${isPositive ? 'text-slate-50' : 'text-red-400'}`}>
          {formatUSD(availableUSD)}
        </p>
        <p className="text-xs text-slate-500">
          {formatCOP(availableCOP)} · pendiente por confirmar: {formatUSD(pendingUSD)}
        </p>
      </div>
      {!isPositive && (
        <p className="w-full text-sm text-red-400">Ya has pagado más de lo que ingresó este mes</p>
      )}
    </div>
  )
}
