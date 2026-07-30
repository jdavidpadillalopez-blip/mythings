import PropTypes from 'prop-types'
import { CreditCard } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { buildAccountBalance } from '../utils/accountBalance'
import { formatCOP } from '../utils/format'

// Generic card for tracking one payment rail's running balance — built for "Tarjeta NU" first
// (money converted from Deel lands there, see SourceTransferManager.jsx), but reusable for any
// other account name that shows up in incomeSources/paymentMethods.
export default function AccountBalanceCard({ accountName }) {
  const { state } = useApp()
  const { totalInCOP, totalOutCOP, balanceCOP } = buildAccountBalance(state, accountName)
  const hasActivity = totalInCOP > 0 || totalOutCOP > 0
  const isPositive = balanceCOP >= 0

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4 bg-slate-900/60 ${
        isPositive ? 'border-cyan-900/60' : 'border-red-900/60'
      }`}
    >
      <div className={`flex items-center gap-2 ${isPositive ? 'text-cyan-400' : 'text-red-400'}`}>
        <CreditCard size={18} />
        <span className="text-xs font-semibold uppercase tracking-wide">Saldo {accountName}</span>
      </div>
      <div className="text-right">
        <p className={`text-xl font-bold ${isPositive ? 'text-slate-50' : 'text-red-400'}`}>
          {formatCOP(balanceCOP)}
        </p>
        <p className="text-xs text-slate-500">
          Entradas {formatCOP(totalInCOP)} · Gastado {formatCOP(totalOutCOP)}
        </p>
      </div>
      {!hasActivity ? (
        <p className="w-full text-xs text-slate-500">
          Aún no hay conversiones registradas hacia {accountName} ni gastos marcados con ese medio de
          pago este mes.
        </p>
      ) : (
        <p className="w-full text-xs text-slate-600">
          No incluye cuotas de deudas pagadas desde esta cuenta — las deudas todavía no tienen un
          medio de pago asociado en la app.
        </p>
      )}
    </div>
  )
}

AccountBalanceCard.propTypes = {
  accountName: PropTypes.string.isRequired,
}
