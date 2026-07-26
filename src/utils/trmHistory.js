const HISTORY_KEY = 'trm_history'

export const TRM_RANGES = ['1D', '1S', '1M', '3M', '1A', 'Todo']

const RANGE_DAYS = { '1D': 1, '1S': 7, '1M': 30, '3M': 90, '1A': 365, Todo: Infinity }

function toDayKey(date) {
  return date.toISOString().slice(0, 10)
}

export function clearTrmHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

export function loadTrmHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveTrmHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

/**
 * Records a TRM reading for its calendar day. A second update on the same day
 * (e.g. manual correction after an API fetch) replaces that day's entry instead
 * of appending a duplicate, so the series stays one point per day.
 */
export function upsertTrmHistoryEntry({ rate, source, timestamp }) {
  if (!Number.isFinite(rate) || rate <= 0 || !timestamp) return loadTrmHistory()

  const history = loadTrmHistory()
  const dayKey = toDayKey(new Date(timestamp))
  const entry = { dayKey, valor: rate, fuente: source ?? 'manual', timestamp }
  const idx = history.findIndex((item) => item.dayKey === dayKey)

  if (idx >= 0) history[idx] = entry
  else history.push(entry)

  history.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  saveTrmHistory(history)
  return history
}

/** Keeps only the entries within `range` (day-window) counting back from now; 'Todo' returns everything. */
export function getTrmHistoryFiltered(history, range) {
  const days = RANGE_DAYS[range] ?? Infinity
  if (days === Infinity) return history
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return history.filter((entry) => new Date(entry.timestamp).getTime() >= cutoff)
}
