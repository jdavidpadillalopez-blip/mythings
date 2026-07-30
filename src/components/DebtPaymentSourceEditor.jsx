import PropTypes from 'prop-types'
import { useApp } from '../context/AppContext'
import { formatCOP } from '../utils/format'

const fieldClass =
  'rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'

/**
 * Lets you set/change which account a paid cuota came from, any time after the fact — shared by
 * DebtInstallmentTracker.jsx (active debts) and DebtManager.jsx's completed-debts section, since a
 * debt that's already 100% paid still needs this (see buildAccountBalances in
 * utils/accountBalance.js, which reads cuota.paymentMethod to compute each account's balance).
 */
export default function DebtPaymentSourceEditor({ debt }) {
  const { state, dispatch } = useApp()
  const paidCuotas = debt.cuotas.filter((cuota) => cuota.estado === 'pagada')

  if (paidCuotas.length === 0) return null

  function handleChange(numero, paymentMethod) {
    dispatch({
      type: 'SET_DEBT_INSTALLMENT_PAYMENT_METHOD',
      payload: { debtId: debt.id, numero, paymentMethod: paymentMethod || null },
    })
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
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
            onChange={(e) => handleChange(cuota.numero, e.target.value)}
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
  )
}

DebtPaymentSourceEditor.propTypes = {
  debt: PropTypes.shape({
    id: PropTypes.string.isRequired,
    cuotas: PropTypes.arrayOf(
      PropTypes.shape({
        numero: PropTypes.number.isRequired,
        montoEsperado: PropTypes.number.isRequired,
        estado: PropTypes.oneOf(['pendiente', 'pagada', 'atrasada']).isRequired,
        paymentMethod: PropTypes.string,
      }),
    ).isRequired,
  }).isRequired,
}
