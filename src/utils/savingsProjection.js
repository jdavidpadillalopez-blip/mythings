// Turns "how much income is left over after fixed expenses and debt payments this month" into a
// forward-looking savings projection for the Bolsillos tab. Deliberately excludes variable expenses
// from the available-capacity calculation (unlike freeCashFlowCOP in calculations.js) — variable
// spending is treated as the flexible portion of the budget that could be redirected toward a
// savings goal, which is the whole point of this feature (see the request that prompted it: "con
// base al ingreso, el dinero gastado en deudas y gastos fijos, cuánto tendría que abonar a mi
// bolsillo mensualmente").
import { getMonthKey, addMonthsToMonthKey } from './debts'
import { computeTotals } from './calculations'

const PROJECTION_MONTHS = 12

function shortMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' }).format(date)
}

export function buildSavingsProjection(state) {
  const { incomes, fixedExpenses, debts, variableExpenses, pockets, trm, recurringTransactions = [] } = state
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

  // What's left of this month's income once fixed expenses and debt installments are covered — the
  // recommended monthly contribution toward savings goals. Clamped at 0: a shortfall here is a
  // budgeting problem to flag, not a negative savings rate to project forward.
  const capacidadAhorroCOP = Math.max(totals.totalIncomeCOP - totals.totalFixedCOP - totals.totalDebtCOP, 0)
  const isDeficit = totals.totalIncomeCOP - totals.totalFixedCOP - totals.totalDebtCOP < 0
  const currentTotalPockets = pockets.reduce((sum, p) => sum + Number(p.valorActual || 0), 0)

  const projection = []
  for (let i = 0; i <= PROJECTION_MONTHS; i += 1) {
    const key = addMonthsToMonthKey(monthKey, i)
    projection.push({
      monthKey: key,
      label: shortMonthLabel(key),
      total: currentTotalPockets + capacidadAhorroCOP * i,
    })
  }

  // Per-goal ETA, each computed *as if all of this month's available capacity went to that one
  // goal alone* — clearly labeled as such in the UI, since with several simultaneous goals the real
  // combined timeline would obviously be longer than each one shown in isolation.
  const goals = pockets
    .filter((p) => p.meta && p.meta > p.valorActual)
    .map((p) => {
      const remaining = p.meta - p.valorActual
      const monthsToReach = capacidadAhorroCOP > 0 ? Math.ceil(remaining / capacidadAhorroCOP) : null
      const reachMonthKey = monthsToReach != null ? addMonthsToMonthKey(monthKey, monthsToReach) : null
      return {
        id: p.id,
        nombre: p.nombre,
        meta: p.meta,
        valorActual: p.valorActual,
        remaining,
        monthsToReach,
        reachMonthKey,
      }
    })
    .sort((a, b) => (a.monthsToReach ?? Infinity) - (b.monthsToReach ?? Infinity))

  return {
    monthKey,
    totalIncomeCOP: totals.totalIncomeCOP,
    totalFixedCOP: totals.totalFixedCOP,
    totalDebtCOP: totals.totalDebtCOP,
    capacidadAhorroCOP,
    isDeficit,
    currentTotalPockets,
    projection,
    goals,
  }
}
