import { useState } from 'react'
import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatPercent, formatDate } from '../utils/format'
import { todayISODate } from '../utils/debts'
import Modal from './Modal'
import DataTable from './DataTable'
import useSortablePaginatedList from '../hooks/useSortablePaginatedList'
import { POCKET_TYPES } from './PocketManager'

// Same radial-progress technique as DebtPayoffRing.jsx (SVG circle + animated stroke-dashoffset) so
// pockets read as part of the same visual system, but with savings-goal semantics: filling up is
// always positive, so it's a single accent color per pocket type instead of a red→green danger scale.
const SIZE = 140
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const RING_STROKE = {
  emerald: '#34d399',
  blue: '#60a5fa',
  amber: '#fbbf24',
  red: '#f87171',
}

function PocketRing({ pocket }) {
  const typeMeta = POCKET_TYPES[pocket.tipo]
  const hasMeta = Number.isFinite(pocket.meta) && pocket.meta > 0
  const pct = hasMeta ? Math.min(1, pocket.valorActual / pocket.meta) : 1
  const stroke = RING_STROKE[typeMeta.color]
  const reachedGoal = hasMeta && pocket.valorActual >= pocket.meta

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
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
          stroke={reachedGoal ? '#fbbf24' : stroke}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - pct) }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {hasMeta ? (
          <>
            <span className="text-2xl font-bold text-slate-50">{formatPercent(pct)}</span>
            <span className="max-w-[100px] text-[10px] text-slate-500">
              {formatCOP(pocket.valorActual)} de {formatCOP(pocket.meta)}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm font-bold text-slate-50">{formatCOP(pocket.valorActual)}</span>
            <span className="text-[10px] text-slate-500">sin meta fijada</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function PocketDetailModal({ pocket, onClose }) {
  const { dispatch } = useApp()
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [fecha, setFecha] = useState(todayISODate())
  const [error, setError] = useState(null)

  const historial = pocket?.historialAportes ?? []
  const table = useSortablePaginatedList(historial, { defaultSortColumn: 'fecha', pageSize: 5 })

  if (!pocket) return <Modal open={false} onClose={onClose} title="" />

  function handleAddContribution(e) {
    e.preventDefault()
    const montoNum = Number(monto)
    if (!Number.isFinite(montoNum) || montoNum === 0) {
      setError('Ingresa un monto distinto de 0')
      return
    }
    if (!concepto.trim()) {
      setError('Escribe un concepto para el aporte')
      return
    }
    setError(null)
    dispatch({
      type: 'ADD_POCKET_CONTRIBUTION',
      payload: {
        pocketId: pocket.id,
        contribution: { id: crypto.randomUUID(), fecha, concepto: concepto.trim(), monto: montoNum },
      },
    })
    setMonto('')
    setConcepto('')
  }

  return (
    <Modal open={!!pocket} onClose={onClose} title={pocket.nombre} widthClassName="max-w-xl">
      <PocketRing pocket={pocket} />

      <form onSubmit={handleAddContribution} className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-800 pt-4 sm:grid-cols-4">
        <input
          type="number"
          value={monto}
          onChange={(e) => {
            setMonto(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Monto COP (+/-)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
        />
        <input
          type="text"
          value={concepto}
          onChange={(e) => {
            setConcepto(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Concepto (ej: Ahorro quincenal)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 sm:col-span-2"
        />
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 sm:col-span-4"
        >
          <Plus size={16} />
          Agregar aporte
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Historial de aportes
        </h3>
        <DataTable
          columns={[
            { key: 'fecha', label: 'Fecha', render: (row) => formatDate(row.fecha) },
            { key: 'concepto', label: 'Concepto' },
            { key: 'monto', label: 'Monto', render: (row) => formatCOP(row.monto) },
          ]}
          rows={table.sortedItems}
          sortColumn={table.sortColumn}
          sortDirection={table.sortDirection}
          onSort={table.toggleSort}
          page={table.page}
          totalPages={table.totalPages}
          onPageChange={table.setPage}
          emptyMessage="Aún no hay aportes registrados."
        />
      </div>
    </Modal>
  )
}

PocketDetailModal.propTypes = {
  pocket: PropTypes.shape({
    id: PropTypes.string.isRequired,
    nombre: PropTypes.string.isRequired,
    tipo: PropTypes.string.isRequired,
    valorActual: PropTypes.number.isRequired,
    meta: PropTypes.number,
    historialAportes: PropTypes.array,
  }),
  onClose: PropTypes.func.isRequired,
}
