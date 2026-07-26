const DEBTS_KEY = 'debts_v2'
const LEGACY_DEFAULT_INSTALLMENTS = 12

// ---- month-key helpers ('YYYY-MM' strings sort/compare chronologically as plain strings) ----

export function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Parses a 'YYYY-MM-DD' string as a local date (avoids the UTC-midnight shift `new Date(str)` does).
function parseISODate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day || 1)
}

export function monthKeyFromISODate(value) {
  return getMonthKey(parseISODate(value))
}

// fechaPago is a full ISO timestamp (not a bare date), so it's safe to hand straight to `Date`.
export function monthKeyFromTimestamp(isoTimestamp) {
  return getMonthKey(new Date(isoTimestamp))
}

export function addMonthsToMonthKey(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number)
  return getMonthKey(new Date(year, month - 1 + offset, 1))
}

export function todayISODate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// ---- installment plan generation ----

/**
 * Builds the full `cuotas` plan for a debt: one entry per installment, numbered 1..numeroCuotasTotal,
 * with `mes` walked forward month-by-month from `fechaInicio`. The regular installments use the
 * (rounded) `cuotaMensual`; the last one absorbs whatever is left of `montoTotal` so the plan always
 * sums exactly to the debt's total even when it doesn't divide evenly.
 */
export function generateInstallments({ montoTotal, cuotaMensual, numeroCuotasTotal, fechaInicio }) {
  const startMonth = monthKeyFromISODate(fechaInicio)
  const regularAmount = Math.round(cuotaMensual)
  const roundedTotal = Math.round(montoTotal)
  const cuotas = []
  let accumulated = 0

  for (let numero = 1; numero <= numeroCuotasTotal; numero++) {
    const isLast = numero === numeroCuotasTotal
    const montoEsperado = isLast ? Math.max(0, roundedTotal - accumulated) : regularAmount
    accumulated += montoEsperado
    cuotas.push({
      numero,
      mes: addMonthsToMonthKey(startMonth, numero - 1),
      montoEsperado,
      estado: 'pendiente',
      fechaPago: null,
    })
  }

  return cuotas
}

/** Marks unpaid installments whose month has arrived or passed as 'atrasada'; leaves paid ones untouched. */
export function deriveInstallmentStatuses(cuotas, currentMonthKey) {
  return cuotas.map((cuota) => {
    if (cuota.estado === 'pagada') return cuota
    const isDueOrPast = cuota.mes <= currentMonthKey
    return { ...cuota, estado: isDueOrPast ? 'atrasada' : 'pendiente' }
  })
}

export function computeEstadoGeneral(cuotas) {
  return cuotas.every((cuota) => cuota.estado === 'pagada') ? 'completada' : 'activa'
}

/** The next unpaid installment in sequence — the one the tracker highlights as "current". */
export function getCurrentInstallmentNumero(cuotas) {
  const next = cuotas.find((cuota) => cuota.estado !== 'pagada')
  return next ? next.numero : null
}

export function sumRemainingBalance(debt) {
  return debt.cuotas.reduce((sum, cuota) => sum + (cuota.estado === 'pagada' ? 0 : cuota.montoEsperado), 0)
}

/** Toggles one installment paid/unpaid, then re-derives atrasada/estadoGeneral for the whole debt. */
export function toggleInstallment(debt, numero, currentMonthKey) {
  const cuotas = debt.cuotas.map((cuota) => {
    if (cuota.numero !== numero) return cuota
    return cuota.estado === 'pagada'
      ? { ...cuota, estado: 'pendiente', fechaPago: null }
      : { ...cuota, estado: 'pagada', fechaPago: new Date().toISOString() }
  })
  const derived = deriveInstallmentStatuses(cuotas, currentMonthKey)
  return { ...debt, cuotas: derived, estadoGeneral: computeEstadoGeneral(derived) }
}

/** Builds (or rebuilds, when `existingId` is passed) a full debt record from the create/edit form values. */
export function buildDebtFromForm({ nombre, montoTotal, cuotaMensual, numeroCuotasTotal, fechaInicio }, existingId) {
  const cuotas = deriveInstallmentStatuses(
    generateInstallments({ montoTotal, cuotaMensual, numeroCuotasTotal, fechaInicio }),
    getMonthKey(new Date()),
  )
  return {
    id: existingId ?? crypto.randomUUID(),
    nombre: nombre.trim(),
    montoTotal: Math.round(montoTotal),
    cuotaMensual: Math.round(cuotaMensual),
    numeroCuotasTotal,
    fechaInicio,
    cuotas,
    estadoGeneral: computeEstadoGeneral(cuotas),
  }
}

// ---- persistence (own localStorage slice, mirroring the trm_history pattern) ----

export function saveDebts(debts) {
  localStorage.setItem(DEBTS_KEY, JSON.stringify(debts))
}

export function clearDebtsStorage() {
  localStorage.removeItem(DEBTS_KEY)
}

function readDebtsKey() {
  try {
    const raw = localStorage.getItem(DEBTS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isLegacyDebt(debt) {
  return !Array.isArray(debt.cuotas)
}

/**
 * One-time migration from the old flat shape ({ name, totalBalance, monthlyPayment }) to the full
 * installment-plan model. There's no historical start date or paid-so-far count in the old data, so
 * migrated debts start their plan this month with nothing paid yet, using a default 12-installment
 * term (the field the old format never captured) — callers should surface a notice so the user can
 * adjust term/start date per debt. `migratedFromLegacy: true` flags which debts to warn about.
 */
export function migrateLegacyDebts(rawDebts) {
  const fechaInicio = `${getMonthKey(new Date())}-01`
  return rawDebts.map((debt) => {
    if (!isLegacyDebt(debt)) return debt
    const montoTotal = Number(debt.totalBalance ?? 0)
    const cuotaMensual = Number(debt.monthlyPayment ?? montoTotal / LEGACY_DEFAULT_INSTALLMENTS) || 0
    const built = buildDebtFromForm(
      {
        nombre: debt.name ?? 'Deuda migrada',
        montoTotal,
        cuotaMensual,
        numeroCuotasTotal: LEGACY_DEFAULT_INSTALLMENTS,
        fechaInicio,
      },
      debt.id,
    )
    return { ...built, migratedFromLegacy: true }
  })
}

/**
 * Resolves the initial debts array on app load: prefers the dedicated `debts_v2` slice; if that's
 * empty, falls back to whatever legacy `debts` array lived in the old combined-state blob (passed in
 * by the caller) and migrates it. Also re-derives atrasada/estadoGeneral against "now", so a plan
 * that was last touched months ago still shows correct overdue flags on load.
 */
export function loadDebtsWithMigration(legacyDebtsFromMainBlob) {
  const stored = readDebtsKey()
  const source = stored ?? (Array.isArray(legacyDebtsFromMainBlob) ? legacyDebtsFromMainBlob : [])
  const needsMigration = source.some(isLegacyDebt)
  const migrated = needsMigration ? migrateLegacyDebts(source) : source

  const currentMonthKey = getMonthKey(new Date())
  const refreshed = migrated.map((debt) => {
    const cuotas = deriveInstallmentStatuses(debt.cuotas, currentMonthKey)
    return { ...debt, cuotas, estadoGeneral: computeEstadoGeneral(cuotas) }
  })

  if (needsMigration || stored === null) saveDebts(refreshed)
  return refreshed
}

// ---- progress aggregation (shared by the Mountain/Rings/Roadmap visualizations) ----

/**
 * One month-by-month balance point per debt, then summed. Two different rules produce the curve:
 *  - Up to and including the current month, the balance only drops when a cuota was actually marked
 *    pagada (keyed by the month its `fechaPago` falls in) — this is the "real" history, so a debt
 *    that's behind schedule just stays flat instead of drifting down on its own.
 *  - After the current month, the balance starts from today's real remaining total and drops as each
 *    still-unpaid cuota's *scheduled* month arrives — the "if everything gets paid on time" projection.
 * A debt that hasn't started yet (fechaInicio in the future relative to a given month) contributes 0
 * for that month rather than its full montoTotal.
 */
function buildDebtBalanceSeries(debts, currentMonthKey) {
  if (debts.length === 0) return []

  const starts = debts.map((debt) => monthKeyFromISODate(debt.fechaInicio))
  const ends = debts.map((debt) => debt.cuotas[debt.cuotas.length - 1]?.mes).filter(Boolean)
  if (ends.length === 0) return []

  let minStart = starts.reduce((min, m) => (m < min ? m : min), starts[0])
  let maxEnd = ends.reduce((max, m) => (m > max ? m : max), ends[0])
  if (currentMonthKey < minStart) minStart = currentMonthKey
  if (currentMonthKey > maxEnd) maxEnd = currentMonthKey

  const currentRemainingByDebt = new Map(debts.map((debt) => [debt.id, sumRemainingBalance(debt)]))

  const months = []
  for (let cursor = minStart; cursor <= maxEnd; cursor = addMonthsToMonthKey(cursor, 1)) {
    months.push(cursor)
  }

  return months.map((mes) => {
    const esProyeccion = mes > currentMonthKey

    const desglose = debts.map((debt) => {
      const debtStartMonth = monthKeyFromISODate(debt.fechaInicio)
      let saldoRestante

      if (mes < debtStartMonth) {
        saldoRestante = 0
      } else if (!esProyeccion) {
        const pagadoHasta = debt.cuotas
          .filter((c) => c.estado === 'pagada' && c.fechaPago && monthKeyFromTimestamp(c.fechaPago) <= mes)
          .reduce((sum, c) => sum + c.montoEsperado, 0)
        saldoRestante = Math.max(0, debt.montoTotal - pagadoHasta)
      } else {
        const programadoHasta = debt.cuotas
          .filter((c) => c.estado !== 'pagada' && c.mes > currentMonthKey && c.mes <= mes)
          .reduce((sum, c) => sum + c.montoEsperado, 0)
        saldoRestante = Math.max(0, currentRemainingByDebt.get(debt.id) - programadoHasta)
      }

      return { id: debt.id, nombre: debt.nombre, saldoRestante }
    })

    const saldoRestante = desglose.reduce((sum, item) => sum + item.saldoRestante, 0)
    return { mes, saldoRestante, esProyeccion, desglose }
  })
}

/**
 * Central data source for the debt-progress visualizations (Mountain, Rings, Roadmap): totals,
 * per-debt completion, and the month-by-month balance series — computed once from `debts` so the
 * three components never each derive their own (possibly inconsistent) numbers.
 */
export function computeDebtProgress(debts) {
  const currentMonthKey = getMonthKey(new Date())

  const totalDeudaOriginal = debts.reduce((sum, debt) => sum + debt.montoTotal, 0)
  const totalPagadoHastaHoy = debts.reduce(
    (sum, debt) =>
      sum + debt.cuotas.filter((c) => c.estado === 'pagada').reduce((s, c) => s + c.montoEsperado, 0),
    0,
  )
  const totalRestante = debts.reduce((sum, debt) => sum + sumRemainingBalance(debt), 0)
  const porcentajeGlobalCompletado = totalDeudaOriginal > 0 ? totalPagadoHastaHoy / totalDeudaOriginal : 0

  const progresoPorDeuda = debts.map((debt) => {
    const total = debt.cuotas.length
    const cuotasPagadas = debt.cuotas.filter((c) => c.estado === 'pagada').length
    const tieneAtrasada = debt.cuotas.some((c) => c.estado === 'atrasada')
    return {
      id: debt.id,
      nombre: debt.nombre,
      porcentajeCompletado: total > 0 ? cuotasPagadas / total : 0,
      cuotasPagadas,
      cuotasTotal: total,
      mesEstimadoFin: debt.cuotas[total - 1]?.mes ?? null,
      estado: debt.estadoGeneral === 'completada' ? 'completada' : tieneAtrasada ? 'atrasada' : 'activa',
    }
  })

  return {
    totalDeudaOriginal,
    totalPagadoHastaHoy,
    totalRestante,
    porcentajeGlobalCompletado,
    seriePorMes: buildDebtBalanceSeries(debts, currentMonthKey),
    progresoPorDeuda,
  }
}
