// Tracks the running balance of a specific payment rail (e.g. "Tarjeta NU") — how much money has
// flowed into it via source transfers (see SourceTransferManager.jsx, "Conversión entre fuentes")
// versus how much has actually been paid out of it, based on which fixed/variable expenses were
// tagged with that same payment method. Debts don't carry a paymentMethod field in this app yet, so
// debt payments aren't reflected here even when they were actually paid from this account — a known
// gap in what the app can track, not a bug in this calculation.
import { getMonthKey } from './debts'

export function buildAccountBalance(state, accountName) {
  const {
    sourceTransfers = [],
    fixedExpenses = [],
    variableExpenses = [],
    fixedExpensePayments = [],
    trm,
  } = state
  const monthKey = getMonthKey(new Date())
  const trmRate = Number(trm?.rate || 0)

  const totalInCOP = sourceTransfers
    .filter((t) => t.toSource === accountName)
    .reduce((sum, t) => sum + Number(t.amountCOP || 0), 0)

  // Only fixed expenses actually confirmed paid this month count as money that's left the account —
  // same "ejecutado, not proyectado" philosophy as AvailableMoneyCard.jsx.
  const fixedOutCOP = fixedExpenses
    .filter((expense) => expense.paymentMethod === accountName)
    .filter((expense) =>
      fixedExpensePayments.some((p) => p.fixedExpenseId === expense.id && p.monthKey === monthKey),
    )
    .reduce((sum, expense) => {
      const amount = Number(expense.amount || 0)
      return sum + (expense.currency === 'USD' ? amount * trmRate : amount)
    }, 0)

  // Variable expenses are logged at the moment they happen, so they're always "executed" — no
  // paid/pending state to check, unlike fixed expenses above.
  const variableOutCOP = variableExpenses
    .filter((expense) => expense.paymentMethod === accountName)
    .reduce((sum, expense) => {
      const amount = Number(expense.amount || 0)
      return sum + (expense.currency === 'USD' ? amount * trmRate : amount)
    }, 0)

  const totalOutCOP = fixedOutCOP + variableOutCOP

  return {
    totalInCOP,
    fixedOutCOP,
    variableOutCOP,
    totalOutCOP,
    balanceCOP: totalInCOP - totalOutCOP,
  }
}
