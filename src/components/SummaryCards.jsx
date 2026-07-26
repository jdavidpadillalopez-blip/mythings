import { motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { TrendingUp, Home, ShoppingBag, Wallet } from 'lucide-react'
import { formatCOP, formatUSD } from '../utils/format'

const CARD_BASE = 'rounded-xl border p-4 flex flex-col gap-1 bg-slate-900/60 transition-colors duration-200'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function SummaryCards({ totals }) {
  const {
    totalIncomeUSD,
    totalIncomeCOP,
    totalFixedCOP,
    totalDebtCOP,
    totalVariableCOP,
    freeCashFlowCOP,
  } = totals

  const isPositive = freeCashFlowCOP >= 0

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <motion.div variants={cardVariants} className={`${CARD_BASE} border-emerald-900/60`}>
        <div className="flex items-center gap-2 text-emerald-400">
          <TrendingUp size={18} />
          <span className="text-xs font-semibold uppercase tracking-wide">Total ingresos</span>
        </div>
        <p className="text-xl font-bold text-slate-50">{formatUSD(totalIncomeUSD)}</p>
        <p className="text-sm text-slate-400">{formatCOP(totalIncomeCOP)}</p>
      </motion.div>

      <motion.div variants={cardVariants} className={`${CARD_BASE} border-blue-900/60`}>
        <div className="flex items-center gap-2 text-blue-400">
          <Home size={18} />
          <span className="text-xs font-semibold uppercase tracking-wide">Gastos fijos + deudas</span>
        </div>
        <p className="text-xl font-bold text-slate-50">{formatCOP(totalFixedCOP + totalDebtCOP)}</p>
        <p className="text-sm text-slate-400">
          Fijos {formatCOP(totalFixedCOP)} · Deudas {formatCOP(totalDebtCOP)}
        </p>
      </motion.div>

      <motion.div variants={cardVariants} className={`${CARD_BASE} border-amber-900/60`}>
        <div className="flex items-center gap-2 text-amber-400">
          <ShoppingBag size={18} />
          <span className="text-xs font-semibold uppercase tracking-wide">Gastos variables</span>
        </div>
        <p className="text-xl font-bold text-slate-50">{formatCOP(totalVariableCOP)}</p>
      </motion.div>

      <motion.div
        variants={cardVariants}
        className={`${CARD_BASE} ${isPositive ? 'border-emerald-900/60' : 'border-red-900/60'}`}
      >
        <div className={`flex items-center gap-2 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          <Wallet size={18} />
          <span className="text-xs font-semibold uppercase tracking-wide">Flujo de caja libre</span>
        </div>
        <p className={`text-xl font-bold ${isPositive ? 'text-slate-50' : 'text-red-400'}`}>
          {formatCOP(freeCashFlowCOP)}
        </p>
        {!isPositive && <p className="text-sm text-red-400">Estás gastando más de lo que ingresas</p>}
      </motion.div>
    </motion.div>
  )
}

SummaryCards.propTypes = {
  totals: PropTypes.shape({
    totalIncomeUSD: PropTypes.number.isRequired,
    totalIncomeCOP: PropTypes.number.isRequired,
    totalFixedCOP: PropTypes.number.isRequired,
    totalDebtCOP: PropTypes.number.isRequired,
    totalVariableCOP: PropTypes.number.isRequired,
    freeCashFlowCOP: PropTypes.number.isRequired,
  }).isRequired,
}
