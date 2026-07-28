import PropTypes from 'prop-types'
import { TrendingUp } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import useSavingsProjection from '../hooks/useSavingsProjection'
import { formatCOP, formatMonthKey } from '../utils/format'

const LINE_COLOR = '#10b981'
// Cycled per goal reference line so two or more simultaneous pocket goals stay visually distinct.
const GOAL_COLORS = ['#f59e0b', '#38bdf8', '#f472b6', '#a78bfa']

function Stat({ label, value, highlight }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-emerald-400' : 'text-slate-200'}`}>{value}</p>
    </div>
  )
}

Stat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  highlight: PropTypes.bool,
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-slate-100">{label}</p>
      <p className="text-slate-300">{formatCOP(payload[0].value)}</p>
    </div>
  )
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.number })),
  label: PropTypes.string,
}

export default function SavingsProjectionCard() {
  const {
    totalIncomeCOP,
    totalFixedCOP,
    totalDebtCOP,
    capacidadAhorroCOP,
    isDeficit,
    projection,
    goals,
  } = useSavingsProjection()

  const hasIncome = totalIncomeCOP > 0

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
        <TrendingUp size={16} />
        Proyección de ahorro
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Con base en el ingreso, los gastos fijos y las deudas de este mes: cuánto podrías destinar a
        tus bolsillos, y hacia dónde te lleva ese ritmo en los próximos 12 meses.
      </p>

      {!hasIncome ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Registra tu ingreso de este mes para ver cuánto podrías destinar a tus bolsillos.
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Ingreso" value={formatCOP(totalIncomeCOP)} />
            <Stat label="Gastos fijos" value={`- ${formatCOP(totalFixedCOP)}`} />
            <Stat label="Deudas" value={`- ${formatCOP(totalDebtCOP)}`} />
            <Stat label="Capacidad de ahorro" value={formatCOP(capacidadAhorroCOP)} highlight />
          </div>

          {isDeficit && (
            <p className="mb-3 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
              Tus gastos fijos y deudas superan tu ingreso de este mes — no queda margen para
              ahorrar hasta que eso cambie.
            </p>
          )}

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={LINE_COLOR} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={LINE_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                  tickFormatter={(value) => formatCOP(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke={LINE_COLOR} strokeWidth={2} fill="url(#savingsFill)" />
                {goals.map((goal, index) => (
                  <ReferenceLine
                    key={goal.id}
                    y={goal.meta}
                    stroke={GOAL_COLORS[index % GOAL_COLORS.length]}
                    strokeDasharray="4 4"
                    label={{
                      value: goal.nombre,
                      position: 'insideTopRight',
                      fill: GOAL_COLORS[index % GOAL_COLORS.length],
                      fontSize: 11,
                    }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {goals.length > 0 && capacidadAhorroCOP > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {goals.map((goal) => (
                <p key={goal.id} className="text-xs text-slate-400">
                  A este ritmo (asumiendo que destinas toda tu capacidad de ahorro a este bolsillo),
                  alcanzarías <span className="text-slate-200">&ldquo;{goal.nombre}&rdquo;</span> (
                  {formatCOP(goal.meta)}) en{' '}
                  <span className="font-medium text-emerald-400">
                    {goal.monthsToReach} {goal.monthsToReach === 1 ? 'mes' : 'meses'}
                  </span>{' '}
                  (~{formatMonthKey(goal.reachMonthKey)}).
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
