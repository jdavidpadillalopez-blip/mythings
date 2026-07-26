import PropTypes from 'prop-types'
import { Mountain } from 'lucide-react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { formatCOP, formatPercent, formatMonthKey } from '../utils/format'
import { getMonthKey } from '../utils/debts'

const GRADIENT_ID = 'mountain-payoff-gradient'

function formatMonthShort(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' }).format(
    new Date(year, month - 1, 1),
  )
}

function MountainTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const total = point.historico ?? point.proyeccion
  const desglose = point.desglose ?? []

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-slate-400">
        {formatMonthKey(point.mes)} {point.proyeccion !== null && point.historico === null ? '(proyección)' : ''}
      </p>
      <p className="font-semibold text-slate-100">{formatCOP(total)}</p>
      {desglose.length > 1 && (
        <ul className="mt-1.5 flex flex-col gap-0.5 border-t border-slate-800 pt-1.5">
          {desglose.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 text-xs text-slate-400">
              <span>{item.nombre}</span>
              <span className="font-medium text-slate-300">{formatCOP(item.saldoRestante)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function DebtPayoffMountain({ progress }) {
  const { seriePorMes, totalPagadoHastaHoy, totalRestante, porcentajeGlobalCompletado } = progress
  const currentMonthKey = getMonthKey(new Date())

  if (seriePorMes.length === 0) return null

  const chartData = seriePorMes.map((point) => ({
    mes: point.mes,
    historico: point.esProyeccion ? null : point.saldoRestante,
    proyeccion: point.esProyeccion ? point.saldoRestante : null,
    desglose: point.desglose,
  }))

  // Connect the dashed projection to exactly where the solid history ends, so there's no visual gap at "hoy".
  const firstProjectionIndex = seriePorMes.findIndex((point) => point.esProyeccion)
  if (firstProjectionIndex > 0) {
    chartData[firstProjectionIndex - 1].proyeccion = chartData[firstProjectionIndex - 1].historico
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
        <Mountain size={16} />
        Montaña de deuda
      </h3>
      <p className="mb-3 text-xs text-slate-500">Saldo total pendiente mes a mes, real y proyectado</p>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity={0.55} />
                <stop offset="55%" stopColor="#fb923c" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="mes"
              tickFormatter={formatMonthShort}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#1e293b' }}
              tickLine={false}
              minTickGap={32}
            />
            <YAxis
              domain={[0, 'dataMax']}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
              tickFormatter={(value) => formatCOP(value).replace('COP', '').trim()}
            />
            <Tooltip content={<MountainTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <ReferenceLine
              x={currentMonthKey}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{
                value: `Hoy: ${formatCOP(totalRestante)}`,
                position: 'insideTopLeft',
                fill: '#cbd5e1',
                fontSize: 11,
              }}
            />
            <Area
              type="stepAfter"
              dataKey="historico"
              stroke="#fb923c"
              strokeWidth={2}
              fill={`url(#${GRADIENT_ID})`}
              connectNulls={false}
              isAnimationActive
              animationDuration={500}
            />
            <Line
              type="stepAfter"
              dataKey="proyeccion"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
              isAnimationActive
              animationDuration={500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald-900/60 bg-slate-950/60 px-3 py-2">
          <p className="text-xs text-slate-500">Pagado hasta hoy</p>
          <p className="text-sm font-semibold text-emerald-400">{formatCOP(totalPagadoHastaHoy)}</p>
        </div>
        <div className="rounded-lg border border-red-900/60 bg-slate-950/60 px-3 py-2">
          <p className="text-xs text-slate-500">Restante</p>
          <p className="text-sm font-semibold text-red-400">{formatCOP(totalRestante)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
          <p className="text-xs text-slate-500">Deuda total eliminada</p>
          <p className="text-sm font-semibold text-slate-100">{formatPercent(porcentajeGlobalCompletado)}</p>
        </div>
      </div>
    </div>
  )
}

DebtPayoffMountain.propTypes = {
  progress: PropTypes.shape({
    seriePorMes: PropTypes.arrayOf(
      PropTypes.shape({
        mes: PropTypes.string.isRequired,
        saldoRestante: PropTypes.number.isRequired,
        esProyeccion: PropTypes.bool.isRequired,
      }),
    ).isRequired,
    totalPagadoHastaHoy: PropTypes.number.isRequired,
    totalRestante: PropTypes.number.isRequired,
    porcentajeGlobalCompletado: PropTypes.number.isRequired,
  }).isRequired,
}
