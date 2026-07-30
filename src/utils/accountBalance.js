// Tracks the running balance of every payment rail/account that shows up anywhere in the app —
// "Deel", "Tarjeta NU", "Efectivo", etc. Money moves between these four ways:
//   - an income lands directly in one (incomes[].source)
//   - a "Conversión entre fuentes" moves it from one to another (sourceTransfers, see
//     SourceTransferManager.jsx)
//   - an expense pays out of one (fixedExpenses[]/variableExpenses[].paymentMethod)
//   - a debt cuota gets paid from one (debts[].cuotas[].paymentMethod, see
//     DebtInstallmentTracker.jsx — set at payment time or edited afterwards)
// Note incomeSources (where income lands) and paymentMethods (how expenses/debts are paid) are kept
// as separate taxonomies (see utils/sources.js) — the same real-world account can appear under two
// different names in each list unless someone deliberately keeps them in sync (e.g. "Deel" the
// income source and "Deel" the payment method), which this function has no way to know unless the
// names match exactly.
import { getMonthKey } from './debts'

export function buildAccountBalances(state) {
  const {
    incomes = [],
    sourceTransfers = [],
    fixedExpenses = [],
    variableExpenses = [],
    fixedExpensePayments = [],
    debts = [],
    incomeSources = [],
    paymentMethods = [],
    trm,
  } = state
  const monthKey = getMonthKey(new Date())
  const trmRate = Number(trm?.rate || 0)

  const names = new Set()
  incomeSources.forEach((s) => names.add(s.nombre))
  paymentMethods.forEach((m) => names.add(m.nombre))
  sourceTransfers.forEach((t) => {
    if (t.fromSource) names.add(t.fromSource)
    if (t.toSource) names.add(t.toSource)
  })
  incomes.forEach((i) => {
    if (i.source) names.add(i.source)
  })

  const toCOP = (expense) => {
    const amount = Number(expense.amount || 0)
    return expense.currency === 'USD' ? amount * trmRate : amount
  }

  const accounts = [...names].map((name) => {
    const incomeInCOP = incomes
      .filter((i) => i.source === name)
      .reduce((sum, i) => sum + Number(i.amountUSD || 0), 0) * trmRate

    const transferInCOP = sourceTransfers
      .filter((t) => t.toSource === name)
      .reduce((sum, t) => sum + Number(t.amountCOP || 0), 0)

    const transferOutCOP = sourceTransfers
      .filter((t) => t.fromSource === name)
      .reduce((sum, t) => sum + Number(t.amountCOP || 0), 0)

    // Only fixed expenses actually confirmed paid this month count as money that's left the
    // account — same "ejecutado, not proyectado" philosophy as AvailableMoneyCard.jsx.
    const fixedOutCOP = fixedExpenses
      .filter((expense) => expense.paymentMethod === name)
      .filter((expense) =>
        fixedExpensePayments.some((p) => p.fixedExpenseId === expense.id && p.monthKey === monthKey),
      )
      .reduce((sum, expense) => sum + toCOP(expense), 0)

    // Variable expenses are logged at the moment they happen, so they're always "executed" — no
    // paid/pending state to check, unlike fixed expenses above.
    const variableOutCOP = variableExpenses
      .filter((expense) => expense.paymentMethod === name)
      .reduce((sum, expense) => sum + toCOP(expense), 0)

    // Debt cuotas are always COP (no currency field, unlike fixed/variable expenses) — only ones
    // actually marked pagada AND tagged with this account count as money that's left it.
    const debtOutCOP = debts.reduce(
      (sum, debt) =>
        sum +
        debt.cuotas
          .filter((cuota) => cuota.estado === 'pagada' && cuota.paymentMethod === name)
          .reduce((s, cuota) => s + Number(cuota.montoEsperado || 0), 0),
      0,
    )

    const totalInCOP = incomeInCOP + transferInCOP
    const totalOutCOP = transferOutCOP + fixedOutCOP + variableOutCOP + debtOutCOP

    return {
      name,
      incomeInCOP,
      transferInCOP,
      transferOutCOP,
      fixedOutCOP,
      variableOutCOP,
      debtOutCOP,
      totalInCOP,
      totalOutCOP,
      balanceCOP: totalInCOP - totalOutCOP,
    }
  })

  // Only accounts that actually had money move through them are worth showing — most
  // paymentMethods (e.g. "PSE") will never have a transfer or income tied to their name.
  return accounts
    .filter((account) => account.totalInCOP > 0 || account.totalOutCOP > 0)
    .sort((a, b) => b.balanceCOP - a.balanceCOP)
}
