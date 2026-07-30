import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { buildExecutionSummary } from '../utils/executionTracking'

/** Derives the Proyectado-vs-Ejecutado breakdown (debts + recurring expenses) for ExecutionTrackingCard.jsx. */
export default function useExecutionSummary() {
  const { state } = useApp()
  return useMemo(() => buildExecutionSummary(state), [state])
}
