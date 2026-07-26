export function sumIncomesUSD(incomes) {
  return incomes.reduce((total, income) => total + Number(income.amountUSD || 0), 0)
}

export function sumFixedExpenses(fixedExpenses) {
  return fixedExpenses.reduce((total, expense) => total + Number(expense.amount || 0), 0)
}

// Only the installment whose `mes` matches the active month counts as this month's fixed expense —
// it counts whether it's already been marked paid or not, since the obligation existed either way.
// Debts that are fully paid off (estadoGeneral === 'completada') no longer contribute at all.
export function sumDebtPayments(debts, monthKey) {
  return debts.reduce((total, debt) => {
    if (debt.estadoGeneral === 'completada') return total
    const cuota = debt.cuotas?.find((item) => item.mes === monthKey)
    return total + Number(cuota?.montoEsperado || 0)
  }, 0)
}

export function sumVariableExpenses(variableExpenses) {
  return variableExpenses.reduce((total, expense) => total + Number(expense.amount || 0), 0)
}

// Recurring-generated occurrences for the active month, split by tipo. 'ingreso' rules are USD
// (consistent with the rest of the income model); gasto_fijo/gasto_variable are COP, same as their
// manual counterparts.
function sumRecurringByTipo(recurringTransactions, monthKey, tipo) {
  return recurringTransactions
    .filter((tx) => tx.tipo === tipo && tx.fecha.slice(0, 7) === monthKey)
    .reduce((total, tx) => total + Number(tx.monto || 0), 0)
}

export function computeTotals({
  incomes,
  fixedExpenses,
  debts,
  variableExpenses,
  trmRate,
  monthKey,
  recurringTransactions = [],
}) {
  const recurringIncomeUSD = sumRecurringByTipo(recurringTransactions, monthKey, 'ingreso')
  const recurringFixedCOP = sumRecurringByTipo(recurringTransactions, monthKey, 'gasto_fijo')
  const recurringVariableCOP = sumRecurringByTipo(recurringTransactions, monthKey, 'gasto_variable')

  const totalIncomeUSD = sumIncomesUSD(incomes) + recurringIncomeUSD
  const totalIncomeCOP = totalIncomeUSD * Number(trmRate || 0)
  const totalFixedCOP = sumFixedExpenses(fixedExpenses) + recurringFixedCOP
  const totalDebtCOP = sumDebtPayments(debts, monthKey)
  const totalVariableCOP = sumVariableExpenses(variableExpenses) + recurringVariableCOP
  const totalExpensesCOP = totalFixedCOP + totalDebtCOP + totalVariableCOP
  // Pockets are savings, not spend — deliberately excluded from free cash flow (they're shown as
  // their own summary card in Dashboard.jsx instead).
  const freeCashFlowCOP = totalIncomeCOP - totalExpensesCOP

  return {
    totalIncomeUSD,
    totalIncomeCOP,
    totalFixedCOP,
    totalDebtCOP,
    totalVariableCOP,
    totalExpensesCOP,
    freeCashFlowCOP,
  }
}
