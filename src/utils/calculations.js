export function sumIncomesUSD(incomes) {
  return incomes.reduce((total, income) => total + Number(income.amountUSD || 0), 0)
}

// Each fixed expense can be denominated in COP or USD (see the currency selector in
// ExpenseForm.jsx) — USD-tagged ones get converted at the current TRM rate so everything downstream
// keeps working in COP like before. Expenses predating the currency field default to 'COP' via
// withCurrencyDefaults in AppContext.jsx, so they pass through unconverted here.
export function sumFixedExpenses(fixedExpenses, trmRate = 0) {
  return fixedExpenses.reduce((total, expense) => {
    const amount = Number(expense.amount || 0)
    const amountCOP = expense.currency === 'USD' ? amount * Number(trmRate || 0) : amount
    return total + amountCOP
  }, 0)
}

// Only the installment whose `mes` matches the active month counts as this month's debt payment —
// it counts whether it's already been marked paid or not, since the obligation existed either way.
// Deliberately does NOT special-case `debt.estadoGeneral === 'completada'`: a debt only reaches
// 'completada' once its *last* cuota gets marked pagada, and that final cuota's month is still a
// real payment that happened — excluding it the instant the debt finishes retroactively erased that
// month's expense and inflated "dinero libre" as if the money had never left, which is exactly
// backwards (paying off a debt is when the money is spent, not when it stops counting). `cuotas` is
// a fixed schedule generated once at creation (see generateInstallments) — there's no scenario where
// a completed debt leaves dangling *future* cuotas that need suppressing, so the per-month lookup
// below already correctly returns 0 for any month outside the original schedule on its own.
export function sumDebtPayments(debts, monthKey) {
  return debts.reduce((total, debt) => {
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
  const totalFixedCOP = sumFixedExpenses(fixedExpenses, trmRate) + recurringFixedCOP
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
