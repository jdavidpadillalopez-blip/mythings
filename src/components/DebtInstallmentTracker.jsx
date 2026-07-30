import { useState } from 'react'
import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { Paperclip } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatPercent, formatMonthKey } from '../utils/format'
import { sumRemainingBalance, getCurrentInstallmentNumero } from '../utils/debts'
import { proofKey, saveProofFile, openProofFile } from '../utils/proofStorage'
import PaymentProofModal from './PaymentProofModal'

const fieldClass =
  'rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'

const CHIP_STYLES = {
  pagada: 'bg-emerald-500 text-emerald-950',
  pendiente: 'bg-slate-700 text-slate-400',
  atrasada: 'bg-orange-500 text-orange-950',
}

function progressBarColor(pct) {
  if (pct < 0.3) return 'bg-red-500'
  if (pct < 0.7) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export default function DebtInstallmentTracker({ debt }) {
  const { state, dispatch } = useApp()
  const [pendingCuota, setPendingCuota] = useState(null)

  const total = debt.cuotas.length
  const paidCuotas = debt.cuotas.filter((cuota) => cuota.estado === 'pagada')
  const paidCount = paidCuotas.length
  const pct = total > 0 ? paidCount / total : 0
  const currentNumero = getCurrentInstallmentNumero(debt.cuotas)
  const remaining = sumRemainingBalance(debt)
  const lastMonth = debt.cuotas[total - 1]?.mes

  function handleChipClick(cuota) {
    if (cuota.estado === 'pagada') {
      // Un-marking only flips the live status back — the file stays in IndexedDB and the
      // achievement already logged in paymentHistory (AppContext.jsx) is never removed, in case
      // it's needed later for a claim/dispute or just as a record of what was paid.
      dispatch({ type: 'TOGGLE_DEBT_INSTALLMENT', payload: { debtId: debt.id, numero: cuota.numero } })
      return
    }
    // Pendiente/atrasada → marking as paid is gated behind attaching a proof file first.
    setPendingCuota(cuota)
  }

  async function handleConfirmProof(file, paymentMethod) {
    const key = proofKey(debt.id, pendingCuota.numero)
    await saveProofFile(key, file)
    dispatch({
      type: 'TOGGLE_DEBT_INSTALLMENT',
      payload: {
        debtId: debt.id,
        numero: pendingCuota.numero,
        comprobante: { nombre: file.name, tipo: file.type, tamano: file.size },
        paymentMethod,
      },
    })
    setPendingCuota(null)
  }

  function handlePaymentMethodChange(numero, paymentMethod) {
    dispatch({
      type: 'SET_DEBT_INSTALLMENT_PAYMENT_METHOD',
      payload: { debtId: debt.id, numero, paymentMethod: paymentMethod || null },
    })
  }

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>
          {paidCount} de {total} cuotas pagadas
        </span>
        <span>{formatPercent(pct)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <motion.div
          className={`h-full rounded-full ${progressBarColor(pct)}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {debt.cuotas.map((cuota) => (
          <div key={cuota.numero} className="relative">
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => handleChipClick(cuota)}
              title={`Cuota ${cuota.numero} · ${formatMonthKey(cuota.mes)} · ${formatCOP(cuota.montoEsperado)} · ${cuota.estado}${
                cuota.comprobante ? ` · comprobante: ${cuota.comprobante.nombre}` : ''
              }${cuota.paymentMethod ? ` · pagado con: ${cuota.paymentMethod}` : ''}`}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition-colors duration-200 ${
                CHIP_STYLES[cuota.estado]
              } ${cuota.numero === currentNumero ? 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-950' : ''}`}
            >
              {cuota.numero}
            </motion.button>
            {cuota.estado === 'pagada' && cuota.comprobante && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openProofFile(proofKey(debt.id, cuota.numero))
                }}
                title={`Ver comprobante: ${cuota.comprobante.nombre}`}
                className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-900 text-emerald-400 ring-1 ring-slate-700 transition-colors duration-200 hover:text-emerald-300"
              >
                <Paperclip size={9} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>
          Saldo restante: <span className="font-semibold text-slate-200">{formatCOP(remaining)}</span>
        </span>
        {lastMonth && (
          <span>
            Finaliza: <span className="font-semibold text-slate-200">{formatMonthKey(lastMonth)}</span>
          </span>
        )}
      </div>

      {paidCuotas.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-800 pt-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            De dónde salió el dinero
          </p>
          {paidCuotas.map((cuota) => (
            <div key={cuota.numero} className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">
                Cuota {cuota.numero} <span className="text-slate-600">·</span>{' '}
                <span className="text-slate-300">{formatCOP(cuota.montoEsperado)}</span>
              </span>
              <select
                value={cuota.paymentMethod ?? ''}
                onChange={(e) => handlePaymentMethodChange(cuota.numero, e.target.value)}
                className={fieldClass}
              >
                <option value="">Sin especificar</option>
                {state.paymentMethods.map((method) => (
                  <option key={method.id} value={method.nombre}>
                    {method.nombre}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <PaymentProofModal
        open={pendingCuota !== null}
        onClose={() => setPendingCuota(null)}
        cuota={pendingCuota}
        onConfirm={handleConfirmProof}
      />
    </div>
  )
}

DebtInstallmentTracker.propTypes = {
  debt: PropTypes.shape({
    id: PropTypes.string.isRequired,
    cuotas: PropTypes.arrayOf(
      PropTypes.shape({
        numero: PropTypes.number.isRequired,
        mes: PropTypes.string.isRequired,
        montoEsperado: PropTypes.number.isRequired,
        estado: PropTypes.oneOf(['pendiente', 'pagada', 'atrasada']).isRequired,
        fechaPago: PropTypes.string,
        comprobante: PropTypes.shape({
          nombre: PropTypes.string,
          tipo: PropTypes.string,
          tamano: PropTypes.number,
        }),
        paymentMethod: PropTypes.string,
      }),
    ).isRequired,
  }).isRequired,
}
