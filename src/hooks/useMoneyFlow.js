import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { buildMoneyFlowBreakdown } from '../utils/moneyFlow'

/** Derives the { totalIncomeCOP, groups } feeding MoneyFlowBreakdown.jsx from global state. Returns
 * null when there's no income yet to build a meaningful flow from. */
export default function useMoneyFlow() {
  const { state } = useApp()
  return useMemo(() => buildMoneyFlowBreakdown(state), [state])
}
