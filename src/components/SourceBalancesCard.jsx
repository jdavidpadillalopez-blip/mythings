import { Landmark } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { buildAccountBalances } from '../utils/accountBalance'
import { formatCOP } from '../utils/format'

export default function SourceBalancesCard() {
  const { state } = useApp()
  const accounts = buildAccountBalances(state)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-400">
        <Landmark size={16} />
        Balances por fuente
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Lo que ha entrado (ingresos y conversiones recibidas) menos lo que ha salido (conversiones
        enviadas, gastos confirmados y cuotas de deuda pagadas con ese medio de pago) en cada cuenta
        o fuente que has usado.
      </p>

      {accounts.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Aún no hay movimientos registrados en ninguna fuente.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((account) => {
            const isPositive = account.balanceCOP >= 0
            return (
              <li
                key={account.name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-100">{account.name}</span>
                <div className="text-right">
                  <p className={`font-semibold ${isPositive ? 'text-slate-50' : 'text-red-400'}`}>
                    {formatCOP(account.balanceCOP)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Entradas {formatCOP(account.totalInCOP)} · Salidas {formatCOP(account.totalOutCOP)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-xs text-slate-600">
        Las cuotas de deuda solo cuentan aquí si les indicaste de dónde salió el dinero (en la
        pestaña Deudas, bajo cada cuota pagada). Las que no tengan medio de pago asignado no
        aparecen descontadas de ninguna cuenta. Si registraste un fee en una conversión entre
        fuentes, ese monto también se descuenta de la cuenta de origen — nunca llega a la cuenta
        destino.
      </p>
    </div>
  )
}
