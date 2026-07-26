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
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
