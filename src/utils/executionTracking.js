// "Proyectado" vs "Ejecutado" for the current month, across the three categories that now have a
// real per-occurrence paid/pending state: a debt cuota's `estado`, a recurring transaction's
// `pagada`, and a fixed expense's presence in `fixedExpensePayments`. variableExpenses/incomes are
// logged at the moment they happen (already "executed" by construction), so they have no
// projected/executed distinction to draw here.
import { getMonthKey } from './debts'

export function buildExecutionSummary(state) {
  const { debts, recurringTransactions = [], fixedExpenses = [], fixedExpensePayments = [] } = state
  const monthKey = getMonthKey(new Date())

  // One record per debt cuota / recurring occurrence / fixed expense that applies this month,
  // tagged with its category and whether it's been confirmed. The totals below and the
  // click-through popups in ExecutionTrackingCard.jsx are both derived from this same list, so a
  // popup for any donut segment always adds up to exactly the number shown on the ring.
  const items = []

  debts.forEach((debt) => {
    const cuota = debt.cuotas?.find((item) => item.mes === monthKey)
    if (!cuota) return
    items.push({
      id: `deuda-${debt.id}`,
      category: 'deudas',
      categoryLabel: 'Deudas',
      name: `${debt.nombre} (cuota ${cuota.numero}/${debt.numeroCuotasTotal})`,
      amount: Number(cuota.montoEsperado || 0),
      paid: cuota.estado === 'pagada',
    })
  })

  recurringTransactions
    .filter((tx) => tx.tipo !== 'ingreso' && tx.fecha.slice(0, 7) === monthKey)
    .forEach((tx) => {
      items.push({
        id: `recurrente-${tx.id}`,
        category: 'recurrentes',
        categoryLabel: 'Recurrentes',
        name: tx.concepto,
        amount: Number(tx.monto || 0),
        paid: !!tx.pagada,
      })
    })

  // Fixed expenses apply every month by definition (no date field of their own), so the full list
  // is this month's projection; execution is whatever's been checked off in fixedExpensePayments for
  // this monthKey specifically.
  fixedExpenses.forEach((expense) => {
    items.push({
      id: `fijo-${expense.id}`,
      category: 'fijos',
      categoryLabel: 'Fijos',
      name: expense.name,
      amount: Number(expense.amount || 0),
      paid: fixedExpensePayments.some(
        (p) => p.fixedExpenseId === expense.id && p.monthKey === monthKey,
      ),
    })
  })

  function sumBy(category, paid) {
    return items
      .filter((item) => item.category === category && (paid === undefined || item.paid === paid))
      .reduce((total, item) => total + item.amount, 0)
  }

  const proyectadoDeudas = sumBy('deudas')
  const proyectadoRecurrentes = sumBy('recurrentes')
  const proyectadoFijos = sumBy('fijos')
  const totalProyectado = proyectadoDeudas + proyectadoRecurrentes + proyectadoFijos

  const ejecutadoDeudas = sumBy('deudas', true)
  const ejecutadoRecurrentes = sumBy('recurrentes', true)
  const ejecutadoFijos = sumBy('fijos', true)
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
    // just be clutter in a popup, so they're excluded here rather than in each caller.
    items: items.filter((item) => item.amount > 0),
  }
}
