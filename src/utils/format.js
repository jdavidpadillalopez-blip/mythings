export function formatCOP(value) {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(safeValue)
}

export function formatUSD(value) {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(safeValue)
}

export function formatPercent(value) {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('es-CO', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(safeValue)
}

/** Formats a 'YYYY-MM' month key as e.g. "agosto 2026". */
export function formatMonthKey(monthKey) {
  if (!monthKey) return ''
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(date)
}

export function formatDate(isoString) {
  if (!isoString) return ''
  // A bare 'YYYY-MM-DD' (no time component) is a calendar date, not an instant — the spec parses
  // it as UTC midnight, which then renders as the *previous* day in any timezone behind UTC (e.g.
  // Colombia, UTC-5). Parsing the components as a local date sidesteps that shift. Full timestamps
  // (with a 'T') represent a real instant and are unaffected, so they still go through `new Date`.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoString)
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
