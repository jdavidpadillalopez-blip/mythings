import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { computeTotals } from '../utils/calculations'
import { getMonthKey } from '../utils/debts'

/** Derives the dashboard's totals (income, fixed/debt/variable expenses, free cash flow) from global state. */
export default function useFinanceSummary() {
  const { state } = useApp()
  const { incomes, fixedExpenses, debts, variableExpenses, recurringTransactions, trm } = state
  const monthKey = getMonthKey(new Date())

  return useMemo(
    () =>
      computeTotals({
        incomes,
        fixedExpenses,
        debts,
        variableExpenses,
        trmRate: trm.rate,
        monthKey,
        recurringTransactions,
      }),
    [incomes, fixedExpenses, debts, variableExpenses, recurringTransactions, trm.rate, monthKey],
  )
}
