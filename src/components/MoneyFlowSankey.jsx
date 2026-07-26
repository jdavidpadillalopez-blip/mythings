import { Sankey, ResponsiveContainer, Tooltip, Rectangle, Layer } from 'recharts'
import { Waves } from 'lucide-react'
import { formatCOP } from '../utils/format'
import useMoneyFlow from '../hooks/useMoneyFlow'

// Same validated hues as ExpenseChart.jsx for the categories they share (fijos/deudas/variables/libre),
// so a glance at either chart reads as the same visual language rather than two unrelated palettes.
const CATEGORY_COLORS = {
  'Gastos fijos': '#3987e5',
  Deudas: '#e66767',
  'Gastos variables': '#c98500',
  'Dinero libre': '#008300',
  'Ingreso total': '#94a3b8',
}
const OTHER_COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#818cf8', '#2dd4bf', '#fb923c', '#a3e635']

// Income-source and payment-method nodes aren't in CATEGORY_COLORS, and recharts' Sankey doesn't
// reliably expose a stable per-node index to color by (link payloads in particular only carry the
// node's name/depth, not its index) — so those get a color picked by hashing the name instead.
// Same name always gets the same color, which is all that matters for a legible diagram.
function hashIndex(name, length) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return Math.abs(hash) % length
}

function colorForNode(name) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name]
  if (name === 'Sin especificar') return '#475569'
  return OTHER_COLORS[hashIndex(name, OTHER_COLORS.length)]
}

function CustomNode({ x, y, width, height, payload }) {
  const color = colorForNode(payload.name)
  const isRightHalf = x > 260
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.9} radius={2} />
      <text
        x={isRightHalf ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={isRightHalf ? 'end' : 'start'}
        dominantBaseline="middle"
        className="fill-slate-200 text-[11px] font-medium"
      >
        {payload.name}
      </text>
      <text
        x={isRightHalf ? x - 6 : x + width + 6}
        y={y + height / 2 + 13}
        textAnchor={isRightHalf ? 'end' : 'start'}
        dominantBaseline="middle"
        className="fill-slate-500 text-[10px]"
      >
        {formatCOP(payload.value)}
      </text>
    </Layer>
  )
}

function CustomLink(props) {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props
  const color = colorForNode(payload.source.name)
  return (
    <path
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.28}
      strokeWidth={Math.max(linkWidth, 1)}
      key={`link-${index}`}
    />
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload
  if (entry?.source && entry?.target) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
        <p className="font-medium text-slate-100">
          {entry.source.name} → {entry.target.name}
        </p>
        <p className="text-slate-300">{formatCOP(entry.value)}</p>
      </div>
    )
  }
  return null
}

export default function MoneyFlowSankey() {
  const flow = useMoneyFlow()

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
        <Waves size={16} />
        Flujo de dinero
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        De dónde entra tu ingreso, a qué se destina, y con qué medio de pago sale.
      </p>

      {!flow ? (
        <p className="py-12 text-center text-sm text-slate-500">
          Registra ingresos con su fuente para ver el flujo de dinero.
        </p>
      ) : (
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={flow}
              node={<CustomNode />}
              link={<CustomLink />}
              nodePadding={22}
              nodeWidth={10}
              margin={{ top: 8, bottom: 8, left: 90, right: 110 }}
            >
              <Tooltip content={<CustomTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-600">
        El dinero se trata como fungible una vez que entra: no rastrea qué peso puntual de una
        fuente terminó pagado por un medio específico, solo cuánto entró por cada fuente y cuánto
        salió por cada medio de pago.
      </p>
    </div>
  )
}
