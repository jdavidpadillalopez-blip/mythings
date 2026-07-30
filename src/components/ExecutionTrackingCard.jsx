import { useMemo, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import useExecutionSummary from '../hooks/useExecutionSummary'
import { formatCOP, formatPercent } from '../utils/format'
import Modal from './Modal'

const SURFACE = '#0f172a'

const COLORS = {
  deudas: '#e66767',
  recurrentes: '#a78bfa',
  fijos: '#38bdf8',
  pendiente: '#334155',
}

const LABELS = {
  deudas: 'Deudas',
  recurrentes: 'Recurrentes',
  fijos: 'Fijos',
  pendiente: 'Pendiente',
}

// Every segment opens the same popup shape (a list of the underlying debts/recurrentes/fijos that
// add up to that slice); only the title changes. "Pendiente" is the odd one out — it spans all
// three categories, so each row's own categoryLabel is what tells you where it came from.
const MODAL_TITLES = {
  deudas: 'Deudas pagadas este mes',
  recurrentes: 'Recurrentes confirmados este mes',
  fijos: 'Fijos confirmados este mes',
  pendiente: 'Pendiente por confirmar este mes',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-slate-100">{item.name}</p>
      <p className="text-slate-300">{formatCOP(item.value)}</p>
      <p className="mt-1 text-[11px] text-slate-500">Clic para ver el detalle</p>
    </div>
  )
}

export default function ExecutionTrackingCard() {
  const { proyectado, ejecutado, pctEjecutado, items } = useExecutionSummary()
  const [activeSegment, setActiveSegment] = useState(null)

  const hasData = proyectado.total > 0
  // The ring is scaled against proyectado.total (not ejecutado.total), so a partially-confirmed
  // month reads as a partially-filled donut rather than always looking "100% done" — the leftover
  // arc is an explicit "Pendiente" segment instead of just being absent.
  const pendiente = Math.max(proyectado.total - ejecutado.total, 0)

  const data = [
    { key: 'deudas', name: LABELS.deudas, value: ejecutado.deudas },
    { key: 'recurrentes', name: LABELS.recurrentes, value: ejecutado.recurrentes },
    { key: 'fijos', name: LABELS.fijos, value: ejecutado.fijos },
    { key: 'pendiente', name: LABELS.pendiente, value: pendiente },
  ].filter((item) => item.value > 0)

  const segmentItems = useMemo(() => {
    if (!activeSegment) return []
    if (activeSegment === 'pendiente') return items.filter((item) => !item.paid)
    return items.filter((item) => item.category === activeSegment && item.paid)
  }, [activeSegment, items])

  const segmentTotal = segmentItems.reduce((total, item) => total + item.amount, 0)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
        <ClipboardCheck size={16} />
        Proyectado vs. ejecutado
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Cuánto de lo proyectado este mes en deudas, recurrentes y gastos fijos ya marcaste como
        confirmado. Pagar algo no lo borra del mes — sigue contando como dinero ya gastado. Haz clic
        en cualquier porción para ver de dónde sale ese número.
      </p>

      {!hasData ? (
        <p className="py-12 text-center text-sm text-slate-500">
          No tienes cuotas de deudas, transacciones recurrentes ni gastos fijos programados para
          este mes.
        </p>
      ) : (
        <>
          <div className="relative h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={2}
                  stroke={SURFACE}
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={COLORS[entry.key]}
                      onClick={() => setActiveSegment(entry.key)}
                      className="cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-50">{formatPercent(pctEjecutado)}</span>
              <span className="text-xs text-slate-500">cumplimiento</span>
            </div>
          </div>

          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.map((item) => (
              <li
                key={item.key}
                className="flex cursor-pointer items-center gap-2 text-sm"
                onClick={() => setActiveSegment(item.key)}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: COLORS[item.key] }}
                  aria-hidden="true"
                />
                <span className="flex-1 text-slate-300 underline decoration-dotted underline-offset-2">
                  {item.name}
                </span>
                <span className="font-medium text-slate-100">{formatCOP(item.value)}</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-slate-500">
            Has ejecutado <span className="font-medium text-slate-200">{formatPercent(pctEjecutado)}</span>{' '}
            de lo proyectado este mes ({formatCOP(ejecutado.total)} de {formatCOP(proyectado.total)}).
          </p>
        </>
      )}

      <Modal
        open={!!activeSegment}
        onClose={() => setActiveSegment(null)}
        title={activeSegment ? MODAL_TITLES[activeSegment] : ''}
        widthClassName="max-w-md"
      >
        {segmentItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No hay movimientos en esta categoría este mes.</p>
        ) : (
          <>
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {segmentItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-100">{item.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.categoryLabel}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-slate-200">{formatCOP(item.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
              Total: <span className="font-medium text-slate-200">{formatCOP(segmentTotal)}</span>
            </p>
          </>
        )}
      </Modal>
    </div>
  )
}
