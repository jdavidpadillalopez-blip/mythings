import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { buildSavingsProjection } from '../utils/savingsProjection'

/** Derives the monthly savings-capacity + 12-month projection feeding SavingsProjectionCard.jsx. */
export default function useSavingsProjection() {
  const { state } = useApp()
  return useMemo(() => buildSavingsProjection(state), [state])
}
