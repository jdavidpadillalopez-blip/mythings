// "Proyectado" vs "Ejecutado" for the current month, across the three categories that now have a
// real per-occurrence paid/pending state: a debt cuota's `estado`, a recurring transaction's
// `pagada`, and a fixed expense's presence in `fixedExpensePayments`. variableExpenses/incomes are
// logged at the moment they happen (already "executed" by construction), so they have no
// projected/executed distinction to draw here.
import { getMonthKey } from './debts'

export function buildExecutionSummary(state) {
  const { debts, recurringTransactions = [], fixedExpenses = [], fixedExpensePayments = [] } = state
  const monthKey = getMonthKey(new Date())

  // Collected alongside the totals below (not derived separately afterwards) so the "pending" list
  // shown in the donut's click-through popup always matches exactly what was excluded from
  // `ejecutado` — one pass, one source of truth for both the aggregate and the detail view.
  const pendingItems = []

  let proyectadoDeudas = 0
  let ejecutadoDeudas = 0
  debts.forEach((debt) => {
    const cuota = debt.cuotas?.find((item) => item.mes === monthKey)
    if (!cuota) return
    const monto = Number(cuota.montoEsperado || 0)
    proyectadoDeudas += monto
    if (cuota.estado === 'pagada') {
      ejecutadoDeudas += monto
    } else {
      pendingItems.push({
        id: `deuda-${debt.id}`,
        category: 'Deudas',
        name: `${debt.nombre} (cuota ${cuota.numero}/${debt.numeroCuotasTotal})`,
        amount: monto,
      })
    }
  })

  let proyectadoRecurrentes = 0
  let ejecutadoRecurrentes = 0
  recurringTransactions
    .filter((tx) => tx.tipo !== 'ingreso' && tx.fecha.slice(0, 7) === monthKey)
    .forEach((tx) => {
      const monto = Number(tx.monto || 0)
      proyectadoRecurrentes += monto
      if (tx.pagada) {
        ejecutadoRecurrentes += monto
      } else {
        pendingItems.push({ id: `recurrente-${tx.id}`, category: 'Recurrentes', name: tx.concepto, amount: monto })
      }
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
    if (paid) {
      ejecutadoFijos += monto
    } else {
      pendingItems.push({ id: `fijo-${expense.id}`, category: 'Fijos', name: expense.name, amount: monto })
    }
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
    // Zero-amount entries (e.g. a fixed expense the user hasn't configured a monto for yet) would
    // just be clutter in the popup, so they're excluded here rather than in the caller.
    pendingItems: pendingItems.filter((item) => item.amount > 0),
  }
}
