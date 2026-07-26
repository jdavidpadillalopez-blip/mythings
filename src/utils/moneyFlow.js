import { getMonthKey } from './debts'
import { computeTotals } from './calculations'

const UNSPECIFIED = 'Sin especificar'

/**
 * Builds { nodes, links } for MoneyFlowSankey.jsx: income sources → "Ingreso total" → expense type
 * (fijos/variables/deudas/libre) → payment method (only for fijos/variables, since that's the only
 * place a payment method is actually recorded — deudas and dinero libre stay as terminal nodes
 * rather than guessing a method for them).
 *
 * Deliberately reuses computeTotals (the same numbers behind SummaryCards/ExpenseChart) for the
 * middle layer so this diagram never disagrees with the rest of the dashboard about how much was
 * spent on what — it only adds the source/method breakdown on top.
 */
export function buildMoneyFlow(state) {
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

  const nodeIndex = new Map()
  const nodes = []
  function nodeFor(name) {
    if (!nodeIndex.has(name)) {
      nodeIndex.set(name, nodes.length)
      nodes.push({ name })
    }
    return nodeIndex.get(name)
  }

  const links = []
  function addLink(sourceName, targetName, value) {
    if (!(value > 0)) return
    links.push({ source: nodeFor(sourceName), target: nodeFor(targetName), value })
  }

  // Layer 1 → 2: each income source's COP total flows into a single "Ingreso total" node.
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
  const INCOME_TOTAL_NODE = 'Ingreso total'
  bySource.forEach((value, label) => addLink(label, INCOME_TOTAL_NODE, value))

  // Layer 2 → 3: split of total income into what it went to, mirroring ExpenseChart's categories.
  addLink(INCOME_TOTAL_NODE, 'Gastos fijos', totals.totalFixedCOP)
  addLink(INCOME_TOTAL_NODE, 'Gastos variables', totals.totalVariableCOP)
  addLink(INCOME_TOTAL_NODE, 'Deudas', totals.totalDebtCOP)
  addLink(INCOME_TOTAL_NODE, 'Dinero libre', Math.max(totals.freeCashFlowCOP, 0))

  // Layer 3 → 4: only fijos/variables carry a real paymentMethod field, so only they fan out further.
  const fixedByMethod = new Map()
  fixedExpenses.forEach((expense) => {
    const label = expense.paymentMethod || UNSPECIFIED
    fixedByMethod.set(label, (fixedByMethod.get(label) || 0) + Number(expense.amount || 0))
  })
  fixedByMethod.forEach((value, label) => addLink('Gastos fijos', label, value))

  const variableByMethod = new Map()
  variableExpenses.forEach((expense) => {
    const label = expense.paymentMethod || UNSPECIFIED
    variableByMethod.set(label, (variableByMethod.get(label) || 0) + Number(expense.amount || 0))
  })
  variableByMethod.forEach((value, label) => addLink('Gastos variables', label, value))

  return { nodes, links }
}
