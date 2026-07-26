import { Trophy, Paperclip } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatDate, formatMonthKey } from '../utils/format'
import { proofKey, openProofFile } from '../utils/proofStorage'

/**
 * Permanent, read-only ledger of every cuota ever marked as pagada with its proof — this is the
 * "registro de éxitos logrados" the user asked to keep, and it never shrinks: unmarking a cuota or
 * archiving/deleting its debt doesn't remove the entry logged here (see AppContext.jsx's
 * TOGGLE_DEBT_INSTALLMENT). Useful both as a motivational log and as a paper trail if a payment
 * ever needs to be disputed or proven later.
 */
export default function PaymentHistoryLog() {
  const { state } = useApp()
  const { paymentHistory } = state

  if (paymentHistory.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
        <Trophy size={16} />
        Historial de pagos
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        Registro permanente de cada cuota pagada con su comprobante — se conserva aunque desmarques
        la cuota o archives la deuda.
      </p>

      <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
        {paymentHistory.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
          >
            <span className="text-xs text-slate-500">{formatDate(entry.fechaPago)}</span>
            <span className="font-medium text-slate-100">{entry.debtNombre}</span>
            <span className="text-xs text-slate-500">
              cuota {entry.numero}/{entry.cuotasTotal} · {formatMonthKey(entry.mes)}
            </span>
            <span className="font-semibold text-emerald-400">{formatCOP(entry.montoEsperado)}</span>
            {entry.comprobante && (
              <button
                type="button"
                onClick={() => openProofFile(proofKey(entry.debtId, entry.numero))}
                title={`Ver comprobante: ${entry.comprobante.nombre}`}
                className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 transition-colors duration-200 hover:text-emerald-400"
              >
                <Paperclip size={12} />
                {entry.comprobante.nombre}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
