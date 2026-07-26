import PropTypes from 'prop-types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCOP, formatPercent } from '../utils/format'

const SURFACE = '#0f172a'

const SEGMENT_COLORS = {
  fijos: '#3987e5',
  deudas: '#e66767',
  variables: '#c98500',
  libre: '#008300',
}

function renderLabel({ cx, cy, midAngle, outerRadius, percent }) {
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 22
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="fill-slate-300 text-xs font-medium"
    >
      {formatPercent(percent)}
    </text>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-slate-100">{item.name}</p>
      <p className="text-slate-300">{formatCOP(item.value)}</p>
      <p className="text-xs text-slate-500">{formatPercent(item.payload.percentOfIncome)}</p>
    </div>
  )
}

export default function ExpenseChart({ totals }) {
  const { totalFixedCOP, totalDebtCOP, totalVariableCOP, totalIncomeCOP, freeCashFlowCOP } = totals

  const libre = Math.max(freeCashFlowCOP, 0)
  const income = totalIncomeCOP > 0 ? totalIncomeCOP : 1

  const rawData = [
    { key: 'fijos', name: 'Gastos fijos', value: totalFixedCOP },
    { key: 'deudas', name: 'Deudas', value: totalDebtCOP },
    { key: 'variables', name: 'Gastos variables', value: totalVariableCOP },
    { key: 'libre', name: 'Dinero libre', value: libre },
  ]
    .filter((item) => item.value > 0)
    .map((item) => ({ ...item, percentOfIncome: item.value / income }))

  const hasData = totalIncomeCOP > 0 && rawData.length > 0

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-300">
        Distribución del ingreso
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Qué porción de tu ingreso total se destina a cada categoría
      </p>

      {!hasData ? (
        <p className="py-12 text-center text-sm text-slate-500">
          Registra tu ingreso en USD y tus gastos para ver la distribución.
        </p>
      ) : (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rawData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                  stroke={SURFACE}
                  strokeWidth={2}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                  label={renderLabel}
                >
                  {rawData.map((entry) => (
                    <Cell key={entry.key} fill={SEGMENT_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rawData.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-sm">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: SEGMENT_COLORS[item.key] }}
                  aria-hidden="true"
                />
                <span className="flex-1 text-slate-300">{item.name}</span>
                <span className="font-medium text-slate-100">{formatCOP(item.value)}</span>
                <span className="w-14 text-right text-xs text-slate-500">
                  {formatPercent(item.percentOfIncome)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

ExpenseChart.propTypes = {
  totals: PropTypes.shape({
    totalFixedCOP: PropTypes.number.isRequired,
    totalDebtCOP: PropTypes.number.isRequired,
    totalVariableCOP: PropTypes.number.isRequired,
    totalIncomeCOP: PropTypes.number.isRequired,
    freeCashFlowCOP: PropTypes.number.isRequired,
  }).isRequired,
}
