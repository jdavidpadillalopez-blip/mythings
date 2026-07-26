import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { Flag, MapPin, Trophy } from 'lucide-react'
import { formatDate, formatMonthKey } from '../utils/format'

const MILESTONES = [25, 50, 75, 100]

function milestoneCuota(debt, percent) {
  const total = debt.cuotas.length
  if (total === 0) return null
  const index = Math.min(total, Math.max(1, Math.ceil((percent / 100) * total)))
  return debt.cuotas[index - 1]
}

export default function DebtPayoffRoadmap({ debt }) {
  const total = debt.cuotas.length
  const paidCount = debt.cuotas.filter((cuota) => cuota.estado === 'pagada').length
  const pct = total > 0 ? paidCount / total : 0
  const tieneAtrasada = debt.cuotas.some((cuota) => cuota.estado === 'atrasada')

  return (
    <div className="relative mt-5 pt-5 pb-2">
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-slate-800">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {MILESTONES.map((milestone) => {
        const cuota = milestoneCuota(debt, milestone)
        const reached = cuota?.estado === 'pagada'
        return (
          <div
            key={milestone}
            className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${milestone}%` }}
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-950 transition-colors duration-300 ${
                reached ? 'bg-emerald-400' : 'bg-slate-700'
              }`}
            >
              {milestone === 100 ? (
                <Trophy size={9} className="text-slate-950" />
              ) : (
                <Flag size={9} className="text-slate-950" />
              )}
            </div>
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              {milestone}% ·{' '}
              {cuota
                ? reached
                  ? `pagada ${formatDate(cuota.fechaPago)}`
                  : `estimado ${formatMonthKey(cuota.mes)}`
                : '—'}
            </div>
          </div>
        )
      })}

      <motion.div
        className="absolute top-1/2 -translate-y-1/2"
        initial={false}
        animate={{ left: `${pct * 100}%` }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        style={{ marginLeft: '-10px' }}
      >
        {tieneAtrasada && (
          <motion.span
            className="absolute -inset-1.5 rounded-full bg-red-500/50"
            animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <MapPin
          size={20}
          fill="currentColor"
          className={`relative drop-shadow ${tieneAtrasada ? 'text-red-400' : 'text-emerald-400'}`}
        />
      </motion.div>
    </div>
  )
}

DebtPayoffRoadmap.propTypes = {
  debt: PropTypes.shape({
    cuotas: PropTypes.arrayOf(
      PropTypes.shape({
        estado: PropTypes.oneOf(['pendiente', 'pagada', 'atrasada']).isRequired,
        mes: PropTypes.string.isRequired,
        fechaPago: PropTypes.string,
      }),
    ).isRequired,
  }).isRequired,
}
