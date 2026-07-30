// The exact set of state slices that make up a full backup — shared by the local file
// export/import (DataManagement.jsx) and the GitHub Gist cloud sync (SyncPanel.jsx) so both stay in
// sync with each other as new state slices get added, instead of each keeping its own list that can
// silently drift apart.
export function buildExportPayload(state) {
  return {
    trm: state.trm,
    incomes: state.incomes,
    debts: state.debts,
    fixedExpenses: state.fixedExpenses,
    variableExpenses: state.variableExpenses,
    pockets: state.pockets,
    recurringRules: state.recurringRules,
    recurringTransactions: state.recurringTransactions,
    fixedExpensePayments: state.fixedExpensePayments,
    categories: state.categories,
    incomeSources: state.incomeSources,
    paymentMethods: state.paymentMethods,
    paymentHistory: state.paymentHistory,
    archivedDebts: state.archivedDebts,
    sourceTransfers: state.sourceTransfers,
  }
}
