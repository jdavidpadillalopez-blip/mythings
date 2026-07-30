import { getMonthKey } from './debts'
import { computeTotals } from './calculations'

const UNSPECIFIED = 'Sin especificar'

// Every item now carries a `details` list (built alongside the aggregate value in the same pass, so
// they can never drift apart) — the underlying rows that add up to that segment, shown in a popup
// when the segment is clicked (see MoneyFlowBreakdown.jsx).
function toItems(valueMap, detailsMap) {
  return [...valueMap.entries()]
    .map(([label, value]) => ({ label, value, details: detailsMap.get(label) ?? [] }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
}

function addDetail(map, label, detail) {
  const list = map.get(label) ?? []
  list.push(detail)
  map.set(label, list)
}

/**
 * Breaks this month's money flow into independent groups — income by source, where that income
 * went (fijos/variables/deudas/libre), and payment method for fijos/variables — instead of one
 * connected graph. The previous version modeled this as a Sankey diagram where nodes were shared by
 * display name across layers; when an income source and a payment method happened to share a label
 * (e.g. both called "Efectivo"), that collapsed into a single node that was simultaneously a source
 * and a downstream target of the same flow — a cycle recharts' Sankey layout can't handle, and it
 * crashed the whole page. Independent groups have no shared graph to form a cycle in, and they're
 * also just easier to read exact numbers from than a tangle of flow-ribbons — see
 * MoneyFlowBreakdown.jsx for how each group renders as its own proportional bar.
 */
export function buildMoneyFlowBreakdown(state) {
  const {
    incomes,
    fixedExpenses,
    debts,
    variableExpenses,
    fixedExpensePayments = [],
    trm,
    recurringTransactions = [],
  } = state
  const monthKey = getMonthKey(new Date())
  const trmRate = Number(trm?.rate || 0)

  const totals = computeTotals({
    incomes,
    fixedExpenses,
    debts,
    variableExpenses,
    trmRate,
    monthKey,
    recurringTransactions,
  })

  if (totals.totalIncomeCOP <= 0) return null

  const toCOP = (expense) => {
    const amount = Number(expense.amount || 0)
    return expense.currency === 'USD' ? amount * trmRate : amount
  }

  // ---- Ingresos por fuente ----
  const bySource = new Map()
  const bySourceDetails = new Map()
  incomes.forEach((income) => {
    const label = income.source || UNSPECIFIED
    const amountCOP = Number(income.amountUSD || 0) * trmRate
    bySource.set(label, (bySource.get(label) || 0) + amountCOP)
    addDetail(bySourceDetails, label, { name: income.description, amount: amountCOP })
  })
  const recurringIncomesThisMonth = recurringTransactions.filter(
    (tx) => tx.tipo === 'ingreso' && tx.fecha.slice(0, 7) === monthKey,
  )
  const recurringIncomeCOP = recurringIncomesThisMonth.reduce((sum, tx) => sum + Number(tx.monto || 0), 0) * trmRate
  if (recurringIncomeCOP > 0) {
    bySource.set('Recurrentes', (bySource.get('Recurrentes') || 0) + recurringIncomeCOP)
    recurringIncomesThisMonth.forEach((tx) => {
      addDetail(bySourceDetails, 'Recurrentes', { name: tx.concepto, amount: Number(tx.monto || 0) * trmRate })
    })
  }

  // ---- Destino de tus ingresos ----
  const destinoDetails = new Map()

  // Fixed expenses aren't month-instanced (see DEFAULT_FIXED_EXPENSES in AppContext.jsx), so the
  // full list is this month's total, matching sumFixedExpenses in calculations.js exactly.
  fixedExpenses.forEach((expense) => {
    addDetail(destinoDetails, 'Gastos fijos', {
      name: expense.name,
      amount: toCOP(expense),
      paid: fixedExpensePayments.some((p) => p.fixedExpenseId === expense.id && p.monthKey === monthKey),
    })
  })
  recurringTransactions
    .filter((tx) => tx.tipo === 'gasto_fijo' && tx.fecha.slice(0, 7) === monthKey)
    .forEach((tx) => {
      addDetail(destinoDetails, 'Gastos fijos', { name: tx.concepto, amount: Number(tx.monto || 0), paid: !!tx.pagada })
    })

  // variableExpenses has no month filter here either, matching sumVariableExpenses's own scope.
  variableExpenses.forEach((expense) => {
    addDetail(destinoDetails, 'Gastos variables', { name: expense.description, amount: toCOP(expense) })
  })
  recurringTransactions
    .filter((tx) => tx.tipo === 'gasto_variable' && tx.fecha.slice(0, 7) === monthKey)
    .forEach((tx) => {
      addDetail(destinoDetails, 'Gastos variables', { name: tx.concepto, amount: Number(tx.monto || 0) })
    })

  // Scoped to cuotas scheduled this month specifically, matching sumDebtPayments in
  // calculations.js exactly (the figure this bar's "Deudas" segment is built from) — a cuota paid
  // ahead of its scheduled month won't appear here even though it does in the Proyectado vs
  // Ejecutado donut (ExecutionTrackingCard.jsx), which uses a different, payment-date-aware scope.
  debts.forEach((debt) => {
    const cuota = debt.cuotas?.find((item) => item.mes === monthKey)
    if (!cuota) return
    addDetail(destinoDetails, 'Deudas', {
      name: `${debt.nombre} (cuota ${cuota.numero}/${debt.numeroCuotasTotal})`,
      amount: Number(cuota.montoEsperado || 0),
      paid: cuota.estado === 'pagada',
    })
  })

  const destino = new Map([
    ['Gastos fijos', totals.totalFixedCOP],
    ['Gastos variables', totals.totalVariableCOP],
    ['Deudas', totals.totalDebtCOP],
    ['Dinero libre', Math.max(totals.freeCashFlowCOP, 0)],
  ])

  // ---- Gastos fijos / variables por medio de pago ----
  const fixedByMethod = new Map()
  const fixedByMethodDetails = new Map()
  fixedExpenses.forEach((expense) => {
    const label = expense.paymentMethod || UNSPECIFIED
    const amountCOP = toCOP(expense)
    fixedByMethod.set(label, (fixedByMethod.get(label) || 0) + amountCOP)
    addDetail(fixedByMethodDetails, label, { name: expense.name, amount: amountCOP })
  })

  const variableByMethod = new Map()
  const variableByMethodDetails = new Map()
  variableExpenses.forEach((expense) => {
    const label = expense.paymentMethod || UNSPECIFIED
    const amountCOP = toCOP(expense)
    variableByMethod.set(label, (variableByMethod.get(label) || 0) + amountCOP)
    addDetail(variableByMethodDetails, label, { name: expense.description, amount: amountCOP })
  })

  const groups = [
    { key: 'sources', title: 'Ingresos por fuente', items: toItems(bySource, bySourceDetails) },
    { key: 'destino', title: 'Destino de tus ingresos', items: toItems(destino, destinoDetails) },
  ]
  if (fixedByMethod.size > 0) {
    groups.push({
      key: 'fixedMethod',
      title: 'Gastos fijos por medio de pago',
      items: toItems(fixedByMethod, fixedByMethodDetails),
    })
  }
  if (variableByMethod.size > 0) {
    groups.push({
      key: 'variableMethod',
      title: 'Gastos variables por medio de pago',
      items: toItems(variableByMethod, variableByMethodDetails),
    })
  }

  return { totalIncomeCOP: totals.totalIncomeCOP, groups }
}
