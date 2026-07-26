import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { buildMoneyFlow } from '../utils/moneyFlow'

/** Derives the { nodes, links } feeding MoneyFlowSankey.jsx from global state. Returns null when
 * there's no income yet to build a meaningful flow from. */
export default function useMoneyFlow() {
  const { state } = useApp()
  return useMemo(() => buildMoneyFlow(state), [state])
}
