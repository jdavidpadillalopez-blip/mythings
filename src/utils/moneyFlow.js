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
  // `key` identifies the node's position in the graph; `name` is only what gets displayed. These
  // are deliberately kept separate: an income source and a payment method can share a human label
  // (e.g. both called "Efectivo") without becoming the *same* node. If they did, the diagram would
  // have a node that is simultaneously a source (layer 1) and a downstream target (layer 4) of the
  // same flow, i.e. a cycle — which recharts' Sankey layout can't handle and recurses forever
  // ("Maximum call stack size exceeded", crashing the whole page). Namespacing the key per layer
  // role prevents that collision even when the display names are identical.
  function nodeFor(key, name) {
    if (!nodeIndex.has(key)) {
      nodeIndex.set(key, nodes.length)
      nodes.push({ name })
    }
    return nodeIndex.get(key)
  }

  const links = []
  function addLink(sourceKey, sourceName, targetKey, targetName, value) {
    if (!(value > 0)) return
    links.push({ source: nodeFor(sourceKey, sourceName), target: nodeFor(targetKey, targetName), value })
  }

  const INCOME_TOTAL_NODE = 'Ingreso total'
  const sourceKey = (label) => `source:${label}`
  const categoryKey = (label) => `category:${label}`
  const methodKey = (label) => `method:${label}`

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
  bySource.forEach((value, label) =>
    addLink(sourceKey(label), label, categoryKey(INCOME_TOTAL_NODE), INCOME_TOTAL_NODE, value),
  )

  // Layer 2 → 3: split of total income into what it went to, mirroring ExpenseChart's categories.
  addLink(categoryKey(INCOME_TOTAL_NODE), INCOME_TOTAL_NODE, categoryKey('Gastos fijos'), 'Gastos fijos', totals.totalFixedCOP)
  addLink(
    categoryKey(INCOME_TOTAL_NODE),
    INCOME_TOTAL_NODE,
    categoryKey('Gastos variables'),
    'Gastos variables',
    totals.totalVariableCOP,
  )
  addLink(categoryKey(INCOME_TOTAL_NODE), INCOME_TOTAL_NODE, categoryKey('Deudas'), 'Deudas', totals.totalDebtCOP)
  addLink(
    categoryKey(INCOME_TOTAL_NODE),
    INCOME_TOTAL_NODE,
    categoryKey('Dinero libre'),
    'Dinero libre',
    Math.max(totals.freeCashFlowCOP, 0),
  )

  // Layer 3 → 4: only fijos/variables carry a real paymentMethod field, so only they fan out further.
  const fixedByMethod = new Map()
  fixedExpenses.forEach((expense) => {
    const label = expense.paymentMethod || UNSPECIFIED
    fixedByMethod.set(label, (fixedByMethod.get(label) || 0) + Number(expense.amount || 0))
  })
  fixedByMethod.forEach((value, label) =>
    addLink(categoryKey('Gastos fijos'), 'Gastos fijos', methodKey(label), label, value),
  )

  const variableByMethod = new Map()
  variableExpenses.forEach((expense) => {
    const label = expense.paymentMethod || UNSPECIFIED
    variableByMethod.set(label, (variableByMethod.get(label) || 0) + Number(expense.amount || 0))
  })
  variableByMethod.forEach((value, label) =>
    addLink(categoryKey('Gastos variables'), 'Gastos variables', methodKey(label), label, value),
  )

  return { nodes, links }
}
