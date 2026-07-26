import { useId } from 'react'
import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { ArrowUp, ArrowDown, LineChart as LineChartIcon } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import useTrmHistory from '../hooks/useTrmHistory'
import { formatCOP, formatPercent, formatDate } from '../utils/format'

const UP_COLOR = '#34d399'
const DOWN_COLOR = '#f87171'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-slate-400">{formatDate(point.timestamp)}</p>
      <p className="font-semibold text-slate-100">{formatCOP(point.valor)}</p>
    </div>
  )
}

export default function TrmHistoryChart({ trm, compact }) {
  const gradientId = useId()
  const { range, setRange, ranges, filtered, change } = useTrmHistory(trm)

  const hasEnoughData = filtered.length >= 2
  const trendColor = change?.isPositive === false ? DOWN_COLOR : UP_COLOR
  const ArrowIcon = change?.isPositive === false ? ArrowDown : ArrowUp

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
            <LineChartIcon size={16} />
            Histórico TRM USD → COP
          </h2>
          <p className="mt-1 text-2xl font-bold text-slate-50">{formatCOP(trm.rate)}</p>
          {change && (
            <p
              className="flex items-center gap-1 text-sm font-medium"
              style={{ color: trendColor }}
            >
              <ArrowIcon size={14} />
              {formatCOP(Math.abs(change.abs))} ({formatPercent(Math.abs(change.pct))})
              <span className="text-slate-500">· {range}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1">
          {ranges.map((r) => {
            const isActive = r === range
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
                  isActive ? 'text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="trm-range-pill"
                    className="absolute inset-0 rounded-md bg-emerald-400"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative">{r}</span>
              </button>
            )
          })}
        </div>
      </div>

      {!hasEnoughData ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <LineChartIcon size={28} className="text-slate-600" />
          <p className="max-w-xs text-sm text-slate-500">
            Aún no hay suficiente histórico. Se irá construyendo con cada actualización diaria de la TRM.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className={compact ? 'h-48 min-w-[480px]' : 'h-72 min-w-[480px] sm:min-w-0'}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="dayKey"
                  tickFormatter={(value) => formatDate(value)}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={(value) => formatCOP(value).replace('COP', '').trim()}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke={trendColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  activeDot={{ r: 5, fill: trendColor, stroke: '#0f172a', strokeWidth: 2 }}
                  isAnimationActive
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

TrmHistoryChart.propTypes = {
  trm: PropTypes.shape({
    rate: PropTypes.number.isRequired,
    lastUpdated: PropTypes.string,
    source: PropTypes.string,
  }).isRequired,
  compact: PropTypes.bool,
}

TrmHistoryChart.defaultProps = {
  compact: false,
}
