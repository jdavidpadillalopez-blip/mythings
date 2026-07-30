import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Waves } from 'lucide-react'
import { formatCOP, formatPercent } from '../utils/format'
import useMoneyFlow from '../hooks/useMoneyFlow'
import Modal from './Modal'

// Same validated hues as ExpenseChart.jsx for the categories they share (fijos/deudas/variables/libre),
// so a glance at either chart reads as the same visual language rather than two unrelated palettes.
const CATEGORY_COLORS = {
  'Gastos fijos': '#3987e5',
  Deudas: '#e66767',
  'Gastos variables': '#c98500',
  'Dinero libre': '#008300',
}
const OTHER_COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#818cf8', '#2dd4bf', '#fb923c', '#a3e635']

// Income-source and payment-method labels aren't in CATEGORY_COLORS, so those get a color picked by
// hashing the name — same label always gets the same color (e.g. "Efectivo" looks the same whether
// it's a source bar or a method bar), which is all that matters for a legible, consistent diagram.
function hashIndex(name, length) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return Math.abs(hash) % length
}

function colorFor(label) {
  if (CATEGORY_COLORS[label]) return CATEGORY_COLORS[label]
  if (label === 'Sin especificar') return '#475569'
  return OTHER_COLORS[hashIndex(label, OTHER_COLORS.length)]
}

/** One proportional horizontal bar (segments scaled against `total`, not just the group's own sum —
 * so a bar whose items add up to less than `total` visibly leaves unfilled track, communicating "this
 * is only part of the whole" for free) plus a legend of label/amount/percent-of-total underneath.
 * Every segment and legend entry is clickable — see onSelect — opening a popup with the rows that
 * add up to that number (MoneyFlowBreakdown's own state holds which one is open). */
function FlowBar({ title, items, total, onSelect }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-400">{title}</p>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(item)}
            style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: colorFor(item.label) }}
            title={`${item.label}: ${formatCOP(item.value)} — clic para ver el detalle`}
            className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
          />
        ))}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="flex cursor-pointer items-center gap-1.5 underline decoration-dotted underline-offset-2 hover:text-slate-200"
            >
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: colorFor(item.label) }} />
              {item.label}: <span className="text-slate-300">{formatCOP(item.value)}</span>
              <span className="text-slate-600">({formatPercent(total > 0 ? item.value / total : 0)})</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

FlowBar.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
      details: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string, amount: PropTypes.number })),
    }),
  ).isRequired,
  total: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
}

export default function MoneyFlowBreakdown() {
  const flow = useMoneyFlow()
  const [selected, setSelected] = useState(null)

  const selectedTotal = useMemo(
    () => (selected ? selected.details.reduce((sum, row) => sum + row.amount, 0) : 0),
    [selected],
  )

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
        <Waves size={16} />
        Flujo de dinero (mes actual)
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        De dónde entra tu ingreso, a qué se destina, y con qué medio de pago sale. Haz clic en
        cualquier segmento para ver el detalle.
      </p>

      {!flow ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Registra ingresos con su fuente para ver el flujo de dinero.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {flow.groups.map((group) => (
            <FlowBar
              key={group.key}
              title={group.title}
              items={group.items}
              total={flow.totalIncomeCOP}
              onSelect={(item) => setSelected({ ...item, groupTitle: group.title })}
            />
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-600">
        Cada barra se compara contra el ingreso total del mes — si una barra no llena todo el ancho,
        el resto se fue a otra parte. El dinero se trata como fungible una vez que entra: no rastrea
        qué peso puntual de una fuente terminó pagado por un medio específico.
      </p>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.groupTitle} — ${selected.label}` : ''}
        widthClassName="max-w-md"
      >
        {selected && selected.details.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No hay un desglose línea por línea para este segmento.
          </p>
        ) : (
          selected && (
            <>
              <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {selected.details.map((row, index) => (
                  <li
                    // eslint-disable-next-line react/no-array-index-key
                    key={`${row.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-100">
                      {row.name}
                      {row.paid !== undefined && (
                        <span className={`ml-2 text-[11px] ${row.paid ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {row.paid ? '· confirmado' : '· pendiente'}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-200">{formatCOP(row.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
                Total: <span className="font-medium text-slate-200">{formatCOP(selectedTotal)}</span>
              </p>
            </>
          )
        )}
      </Modal>
    </div>
  )
}
