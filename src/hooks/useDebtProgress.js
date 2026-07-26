import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { computeDebtProgress } from '../utils/debts'

/**
 * Shared data source for the debt-progress visualizations (Mountain, Rings, Roadmap) — totals,
 * per-debt completion, and the month-by-month balance series, derived once from global state.
 */
export default function useDebtProgress() {
  const { state } = useApp()
  return useMemo(() => computeDebtProgress(state.debts), [state.debts])
}
