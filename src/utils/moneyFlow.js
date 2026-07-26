import { getMonthKey } from './debts'
import { computeTotals } from './calculations'

const UNSPECIFIED = 'Sin especificar'

function toItems(map) {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
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
  const { incomes, fixedExpenses, debts, variableExpenses, trm, recurringTransactions = [] } = state
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

  const bySource = new Map()
  incomes.forEach((income) => {
    const label = income.source || UNSPECIFIED
    bySource.set(label, (bySource.get(label) || 0) + Number(income.amountUSD || 0) * trmRate)
  })
  const recurringIncomeCOP =
    recurringTransactions
      .filter((tx) => tx.tipo === 'ingreso' && tx.fecha.slice(0, 7) === monthKey)
      .reduce((sum, tx) => sum + Number(tx.monto || 0), 0) * trmRate
  if (recurringIncomeCOP > 0) {
    bySource.set('Recurrentes', (bySource.get('Recurrentes') || 0) + recurringIncomeCOP)
  }

  const destino = new Map([
    ['Gastos fijos', totals.totalFixedCOP],
    ['Gastos variables', totals.totalVariableCOP],
    ['Deudas', totals.totalDebtCOP],
    ['Dinero libre', Math.max(totals.freeCashFlowCOP, 0)],
  ])

  const fixedByMethod = new Map()
  fixedExpenses.forEach((expense) => {
    const label = expense.paymentMethod || UNSPECIFIED
    fixedByMethod.set(label, (fixedByMethod.get(label) || 0) + Number(expense.amount || 0))
  })

  const variableByMethod = new Map()
  variableExpenses.forEach((expense) => {
    const label = expense.paymentMethod || UNSPECIFIED
    variableByMethod.set(label, (variableByMethod.get(label) || 0) + Number(expense.amount || 0))
  })

  const groups = [
    { key: 'sources', title: 'Ingresos por fuente', items: toItems(bySource) },
    { key: 'destino', title: 'Destino de tus ingresos', items: toItems(destino) },
  ]
  if (fixedByMethod.size > 0) {
    groups.push({ key: 'fixedMethod', title: 'Gastos fijos por medio de pago', items: toItems(fixedByMethod) })
  }
  if (variableByMethod.size > 0) {
    groups.push({
      key: 'variableMethod',
      title: 'Gastos variables por medio de pago',
      items: toItems(variableByMethod),
    })
  }

  return { totalIncomeCOP: totals.totalIncomeCOP, groups }
}
