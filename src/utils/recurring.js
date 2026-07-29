import { getMonthKey, addMonthsToMonthKey } from './debts'

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseISODate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDaysISO(dateISO, days) {
  const date = parseISODate(dateISO)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** One occurrence per `stepDays` starting at fechaDesde, up to and including `end`. */
function stepOccurrences(fechaDesde, end, stepDays) {
  const dates = []
  let cursor = fechaDesde
  while (cursor <= end) {
    dates.push(cursor)
    cursor = addDaysISO(cursor, stepDays)
  }
  return dates
}

/** One occurrence per month on `diaReferencia` (clamped to each month's last day), from fechaDesde's month through `end`. */
function monthlyOccurrences(fechaDesde, end, diaReferencia) {
  const dates = []
  let [year, month] = fechaDesde.split('-').map(Number)
  const endKey = getMonthKey(parseISODate(end))
  let cursorKey = getMonthKey(parseISODate(fechaDesde))

  while (cursorKey <= endKey) {
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const day = Math.min(diaReferencia, lastDayOfMonth)
    const occurrence = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (occurrence >= fechaDesde && occurrence <= end) dates.push(occurrence)

    const nextKey = addMonthsToMonthKey(cursorKey, 1)
    ;[year, month] = nextKey.split('-').map(Number)
    cursorKey = nextKey
  }

  return dates
}

/**
 * Expands a recurring rule into its concrete dated occurrences between `regla.fechaDesde` and
 * `hastaFecha` (or `regla.fechaHasta`, whichever comes first). Each occurrence gets a deterministic
 * id (`${regla.id}-${fecha}`) so re-running this against the same rule and re-appending only the ids
 * not already present naturally deduplicates — no separate "already generated" bookkeeping needed.
 */
export function generarTransaccionesDesdeRegla(regla, hastaFecha) {
  const end = regla.fechaHasta && regla.fechaHasta < hastaFecha ? regla.fechaHasta : hastaFecha
  if (end < regla.fechaDesde) return []

  let dates
  if (regla.frecuencia === 'mensual') dates = monthlyOccurrences(regla.fechaDesde, end, regla.diaReferencia)
  else if (regla.frecuencia === 'quincenal') dates = stepOccurrences(regla.fechaDesde, end, 15)
  else dates = stepOccurrences(regla.fechaDesde, end, 7) // semanal

  return dates.map((fecha) => ({
    id: `${regla.id}-${fecha}`,
    origenReglaId: regla.id,
    tipo: regla.tipo,
    concepto: regla.concepto,
    categoria: regla.categoria,
    monto: regla.monto,
    fecha,
    bolsilloId: regla.bolsilloId ?? null,
    // Whether the user has actually confirmed this occurrence happened (paid the bill / received
    // the income) — separate from it existing in the ledger at all. Occurrences are appended here
    // the moment their date arrives regardless of confirmation, same as debt cuotas count toward
    // totals whether marked paid or not; `pagada` is purely a tracking/checklist flag (see
    // RecurringPaymentChecklist.jsx), not something totals/reports filter on.
    pagada: false,
  }))
}
