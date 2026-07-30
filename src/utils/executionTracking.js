// "Proyectado" vs "Ejecutado" for the current month, across the three categories that now have a
// real per-occurrence paid/pending state: a debt cuota's `estado`, a recurring transaction's
// `pagada`, and a fixed expense's presence in `fixedExpensePayments`. variableExpenses/incomes are
// logged at the moment they happen (already "executed" by construction), so they have no
// projected/executed distinction to draw here.
import { getMonthKey } from './debts'

export function buildExecutionSummary(state) {
  const { debts, recurringTransactions = [], fixedExpenses = [], fixedExpensePayments = [] } = state
  const monthKey = getMonthKey(new Date())

  let proyectadoDeudas = 0
  let ejecutadoDeudas = 0
  debts.forEach((debt) => {
    const cuota = debt.cuotas?.find((item) => item.mes === monthKey)
    if (!cuota) return
    proyectadoDeudas += Number(cuota.montoEsperado || 0)
    if (cuota.estado === 'pagada') ejecutadoDeudas += Number(cuota.montoEsperado || 0)
  })

  let proyectadoRecurrentes = 0
  let ejecutadoRecurrentes = 0
  recurringTransactions
    .filter((tx) => tx.tipo !== 'ingreso' && tx.fecha.slice(0, 7) === monthKey)
    .forEach((tx) => {
      proyectadoRecurrentes += Number(tx.monto || 0)
      if (tx.pagada) ejecutadoRecurrentes += Number(tx.monto || 0)
    })

  // Fixed expenses apply every month by definition (no date field of their own), so the full list
  // is this month's projection; execution is whatever's been checked off in fixedExpensePayments for
  // this monthKey specifically.
  let proyectadoFijos = 0
  let ejecutadoFijos = 0
  fixedExpenses.forEach((expense) => {
    const monto = Number(expense.amount || 0)
    proyectadoFijos += monto
    const paid = fixedExpensePayments.some(
      (p) => p.fixedExpenseId === expense.id && p.monthKey === monthKey,
    )
    if (paid) ejecutadoFijos += monto
  })

  const totalProyectado = proyectadoDeudas + proyectadoRecurrentes + proyectadoFijos
  const totalEjecutado = ejecutadoDeudas + ejecutadoRecurrentes + ejecutadoFijos

  return {
    monthKey,
    proyectado: {
      deudas: proyectadoDeudas,
      recurrentes: proyectadoRecurrentes,
      fijos: proyectadoFijos,
      total: totalProyectado,
    },
    ejecutado: {
      deudas: ejecutadoDeudas,
      recurrentes: ejecutadoRecurrentes,
      fijos: ejecutadoFijos,
      total: totalEjecutado,
    },
    pctEjecutado: totalProyectado > 0 ? totalEjecutado / totalProyectado : 0,
  }
}
