import { useEffect, useMemo, useState } from 'react'
import { loadTrmHistory, getTrmHistoryFiltered, TRM_RANGES } from '../utils/trmHistory'

/**
 * Reads the persisted TRM series (trm_history in localStorage), keeps it in sync
 * whenever the active TRM changes, and exposes the range-filtered slice plus the
 * absolute/percentage variation across that slice (Google Finance-style header).
 */
export default function useTrmHistory(trm) {
  const [history, setHistory] = useState(() => loadTrmHistory())
  const [range, setRange] = useState('1M')

  useEffect(() => {
    setHistory(loadTrmHistory())
  }, [trm?.rate, trm?.lastUpdated])

  const filtered = useMemo(() => getTrmHistoryFiltered(history, range), [history, range])

  const change = useMemo(() => {
    if (filtered.length < 2) return null
    const first = filtered[0].valor
    const last = filtered[filtered.length - 1].valor
    const abs = last - first
    const pct = first !== 0 ? abs / first : 0
    return { abs, pct, isPositive: abs >= 0 }
  }, [filtered])

  return { history, range, setRange, ranges: TRM_RANGES, filtered, change }
}
