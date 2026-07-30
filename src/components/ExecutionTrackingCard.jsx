import { ClipboardCheck } from 'lucide-react'
import useExecutionSummary from '../hooks/useExecutionSummary'
import { formatCOP, formatPercent } from '../utils/format'

const COLORS = {
  deudas: '#e66767',
  recurrentes: '#a78bfa',
  fijos: '#38bdf8',
}

/** One bar whose segments are scaled against `total` (not the bar's own subtotal), so "Ejecutado"
 * visibly fills only part of the same track "Proyectado" fills completely — the shared denominator
 * is what makes the two bars read as a before/after of the same money instead of two unrelated charts. */
function Bar({ label, deudas, recurrentes, fijos, total }) {
  const segments = [
    { key: 'deudas', label: 'Deudas', value: deudas },
    { key: 'recurrentes', label: 'Recurrentes', value: recurrentes },
    { key: 'fijos', label: 'Fijos', value: fijos },
  ].filter((s) => s.value > 0)

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-400">{label}</span>
        <span className="text-slate-300">{formatCOP(deudas + recurrentes + fijos)}</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%`, backgroundColor: COLORS[s.key] }}
            title={`${s.label}: ${formatCOP(s.value)}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function ExecutionTrackingCard() {
  const { proyectado, ejecutado, pctEjecutado } = useExecutionSummary()

  const hasData = proyectado.total > 0

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
        <ClipboardCheck size={16} />
        Proyectado vs. ejecutado (deudas, recurrentes y fijos)
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Lo que se espera este mes en cuotas de deudas, transacciones recurrentes y gastos fijos,
        contra lo que ya marcaste como confirmado. Pagar una deuda, un recurrente o un gasto fijo no
        lo borra del mes — sigue contando como dinero ya gastado.
      </p>

      {!hasData ? (
        <p className="py-6 text-center text-sm text-slate-500">
          No tienes cuotas de deudas, transacciones recurrentes ni gastos fijos programados para
          este mes.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <Bar
              label="Proyectado"
              deudas={proyectado.deudas}
              recurrentes={proyectado.recurrentes}
              fijos={proyectado.fijos}
              total={proyectado.total}
            />
            <Bar
              label="Ejecutado"
              deudas={ejecutado.deudas}
              recurrentes={ejecutado.recurrentes}
              fijos={ejecutado.fijos}
              total={proyectado.total}
            />
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <li className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: COLORS.deudas }} />
              Deudas
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: COLORS.recurrentes }} />
              Recurrentes
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: COLORS.fijos }} />
              Fijos
            </li>
          </ul>

          <p className="mt-3 text-xs text-slate-500">
            Has ejecutado <span className="font-medium text-slate-200">{formatPercent(pctEjecutado)}</span>{' '}
            de lo proyectado este mes ({formatCOP(ejecutado.total)} de {formatCOP(proyectado.total)}).
          </p>
        </>
      )}
    </div>
  )
}
