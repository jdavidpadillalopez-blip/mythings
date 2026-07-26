import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import confetti from 'canvas-confetti'
import { formatMonthKey } from '../utils/format'

const SIZE = 128
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Same semantic thresholds as the chip tracker's progress bar; gold marks a fully paid-off debt.
function ringColor(pct) {
  if (pct >= 1) return '#fbbf24'
  if (pct < 0.3) return '#ef4444'
  if (pct < 0.7) return '#f59e0b'
  return '#10b981'
}

export default function DebtPayoffRing({ progress }) {
  const { nombre, porcentajeCompletado, cuotasPagadas, cuotasTotal, mesEstimadoFin, estado } = progress
  const pct = Math.min(1, Math.max(0, porcentajeCompletado))
  const isComplete = pct >= 1
  const wasCompleteRef = useRef(isComplete)
  const containerRef = useRef(null)

  // Fires the confetti burst exactly once, at the moment a debt crosses into 100% — not on every
  // render of an already-completed debt (e.g. on page load).
  useEffect(() => {
    if (isComplete && !wasCompleteRef.current) {
      const rect = containerRef.current?.getBoundingClientRect()
      confetti({
        particleCount: 60,
        spread: 65,
        startVelocity: 28,
        gravity: 1,
        scalar: 0.8,
        origin: rect
          ? {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight,
            }
          : { x: 0.5, y: 0.5 },
      })
    }
    wasCompleteRef.current = isComplete
  }, [isComplete])

  const color = ringColor(pct)

  return (
    <div
      ref={containerRef}
      className={`flex w-40 shrink-0 flex-col items-center rounded-xl border p-4 transition-colors duration-300 ${
        isComplete ? 'border-amber-400/60 bg-amber-950/10' : 'border-slate-800 bg-slate-900/60'
      }`}
    >
      <motion.div
        className="relative"
        animate={isComplete ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="#1e293b" strokeWidth={STROKE} fill="none" />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - pct), stroke: color }}
            transition={{
              strokeDashoffset: { duration: 0.6, ease: 'easeOut' },
              stroke: { duration: 0.4 },
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isComplete ? (
            <Trophy size={22} className="text-amber-400" />
          ) : (
            <span className="text-xl font-bold text-slate-50">{Math.round(pct * 100)}%</span>
          )}
          <span className="text-[10px] text-slate-500">
            {cuotasPagadas} de {cuotasTotal}
          </span>
        </div>
      </motion.div>

      <p className="mt-2 max-w-full truncate text-center text-sm font-medium text-slate-100" title={nombre}>
        {nombre}
      </p>
      <p className="text-xs text-slate-500">
        {isComplete ? '✅ Saldada' : `Termina: ${formatMonthKey(mesEstimadoFin)}`}
      </p>
      {estado === 'atrasada' && (
        <span className="mt-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
          Cuota atrasada
        </span>
      )}
    </div>
  )
}

DebtPayoffRing.propTypes = {
  progress: PropTypes.shape({
    id: PropTypes.string.isRequired,
    nombre: PropTypes.string.isRequired,
    porcentajeCompletado: PropTypes.number.isRequired,
    cuotasPagadas: PropTypes.number.isRequired,
    cuotasTotal: PropTypes.number.isRequired,
    mesEstimadoFin: PropTypes.string,
    estado: PropTypes.oneOf(['activa', 'completada', 'atrasada']).isRequired,
  }).isRequired,
}
