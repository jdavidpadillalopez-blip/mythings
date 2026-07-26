import { motion } from 'framer-motion'
import { PartyPopper } from 'lucide-react'
import useDebtProgress from '../hooks/useDebtProgress'
import DebtPayoffMountain from './DebtPayoffMountain'
import DebtPayoffRing from './DebtPayoffRing'

export default function DebtProgressOverview() {
  const progress = useDebtProgress()
  const { progresoPorDeuda } = progress

  if (progresoPorDeuda.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center">
        <PartyPopper size={28} className="text-emerald-400" />
        <p className="max-w-sm text-sm text-slate-400">
          🎉 No tienes deudas activas registradas. ¡Cuando agregues una, verás aquí tu progreso!
        </p>
      </div>
    )
  }

  // Active/overdue debts lead the row; fully paid ones trail as a row of "trophies".
  const orderedRings = [...progresoPorDeuda].sort((a, b) => {
    if (a.estado === 'completada' && b.estado !== 'completada') return 1
    if (a.estado !== 'completada' && b.estado === 'completada') return -1
    return 0
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      <DebtPayoffMountain progress={progress} />

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
          Progreso por deuda
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {orderedRings.map((debtProgress) => (
            <DebtPayoffRing key={debtProgress.id} progress={debtProgress} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
