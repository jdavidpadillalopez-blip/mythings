import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { formatCOP, formatPercent, formatMonthKey } from '../utils/format'
import { sumRemainingBalance, getCurrentInstallmentNumero } from '../utils/debts'

const CHIP_STYLES = {
  pagada: 'bg-emerald-500 text-emerald-950',
  pendiente: 'bg-slate-700 text-slate-400',
  atrasada: 'bg-orange-500 text-orange-950',
}

function progressBarColor(pct) {
  if (pct < 0.3) return 'bg-red-500'
  if (pct < 0.7) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export default function DebtInstallmentTracker({ debt, onToggle }) {
  const total = debt.cuotas.length
  const paidCount = debt.cuotas.filter((cuota) => cuota.estado === 'pagada').length
  const pct = total > 0 ? paidCount / total : 0
  const currentNumero = getCurrentInstallmentNumero(debt.cuotas)
  const remaining = sumRemainingBalance(debt)
  const lastMonth = debt.cuotas[total - 1]?.mes

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>
          {paidCount} de {total} cuotas pagadas
        </span>
        <span>{formatPercent(pct)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <motion.div
          className={`h-full rounded-full ${progressBarColor(pct)}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {debt.cuotas.map((cuota) => (
          <motion.button
            key={cuota.numero}
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => onToggle(cuota.numero)}
            title={`Cuota ${cuota.numero} · ${formatMonthKey(cuota.mes)} · ${formatCOP(cuota.montoEsperado)} · ${cuota.estado}`}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition-colors duration-200 ${
              CHIP_STYLES[cuota.estado]
            } ${cuota.numero === currentNumero ? 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-950' : ''}`}
          >
            {cuota.numero}
          </motion.button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>
          Saldo restante: <span className="font-semibold text-slate-200">{formatCOP(remaining)}</span>
        </span>
        {lastMonth && (
          <span>
            Finaliza: <span className="font-semibold text-slate-200">{formatMonthKey(lastMonth)}</span>
          </span>
        )}
      </div>
    </div>
  )
}

DebtInstallmentTracker.propTypes = {
  debt: PropTypes.shape({
    cuotas: PropTypes.arrayOf(
      PropTypes.shape({
        numero: PropTypes.number.isRequired,
        mes: PropTypes.string.isRequired,
        montoEsperado: PropTypes.number.isRequired,
        estado: PropTypes.oneOf(['pendiente', 'pagada', 'atrasada']).isRequired,
        fechaPago: PropTypes.string,
      }),
    ).isRequired,
  }).isRequired,
  onToggle: PropTypes.func.isRequired,
}
