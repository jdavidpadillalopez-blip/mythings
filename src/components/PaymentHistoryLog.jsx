import { useState } from 'react'
import { Trophy, Paperclip, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatDate, formatMonthKey } from '../utils/format'
import { proofKey, openProofFile } from '../utils/proofStorage'

/**
 * Log of every cuota ever marked as pagada with its proof — this is the "registro de éxitos
 * logrados" the user asked to keep, and it doesn't shrink on its own: unmarking a cuota or
 * archiving/deleting its debt doesn't remove the entry logged here (see AppContext.jsx's
 * TOGGLE_DEBT_INSTALLMENT). Useful both as a motivational log and as a paper trail if a payment
 * ever needs to be disputed or proven later. A specific entry can still be deleted by hand below,
 * for the rare case of a stale/duplicate record (e.g. left over after unmarking and re-marking a
 * cuota with corrected details) — that's a manual correction, not something the app does on its own.
 */
export default function PaymentHistoryLog() {
  const { state, dispatch } = useApp()
  const { paymentHistory } = state
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  if (paymentHistory.length === 0) return null

  function handleDelete(entry) {
    if (pendingDeleteId !== entry.id) {
      setPendingDeleteId(entry.id)
      return
    }
    dispatch({ type: 'DELETE_PAYMENT_HISTORY_ENTRY', payload: entry.id })
    setPendingDeleteId(null)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
        <Trophy size={16} />
        Historial de pagos
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        Registro de cada cuota pagada con su comprobante — se conserva aunque desmarques la cuota o
        archives la deuda. Puedes borrar a mano una entrada puntual si quedó duplicada o desactualizada.
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
            <button
              type="button"
              onClick={() => handleDelete(entry)}
              onBlur={() => setPendingDeleteId((current) => (current === entry.id ? null : current))}
              title={pendingDeleteId === entry.id ? 'Clic de nuevo para confirmar borrado' : 'Borrar esta entrada del historial'}
              className={`inline-flex items-center gap-1 text-xs transition-colors duration-200 ${
                entry.comprobante ? '' : 'ml-auto'
              } ${pendingDeleteId === entry.id ? 'text-red-400' : 'text-slate-500 hover:text-red-400'}`}
            >
              <Trash2 size={12} />
              {pendingDeleteId === entry.id ? 'Confirmar' : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
