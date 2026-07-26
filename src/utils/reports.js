import { getMonthKey, addMonthsToMonthKey } from './debts'

function monthsBetween(fromISO, toISO) {
  const parse = (v) => {
    const [y, m, d] = v.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const start = getMonthKey(parse(fromISO))
  const end = getMonthKey(parse(toISO))
  const months = []
  let cursor = start
  while (cursor <= end) {
    months.push(cursor)
    cursor = addMonthsToMonthKey(cursor, 1)
  }
  return months
}

/**
 * Merges every money-moving slice of state (incomes, variable expenses, recurring-generated
 * transactions, pocket contributions, fixed expenses, debt installments) into one flat list of
 * `{ id, tipo, categoria, concepto, monto, fecha }` rows for the Reports table/charts.
 *
 * Incomes/variable expenses/recurring/aportes already carry an exact date, so those are filtered
 * straight against [from, to]. fixedExpenses and debt cuotas don't have a per-occurrence date in
 * their own models (a fixed expense is just "this month's amount"), so one row per calendar month
 * in range is synthesized for those, dated to the 1st of each month.
 */
export function buildUnifiedTransactions(state, { from, to }) {
  const trmRate = state.trm.rate
  const rows = []

  state.incomes.forEach((item) => {
    const fecha = item.date.slice(0, 10)
    if (fecha < from || fecha > to) return
    rows.push({
      id: `income-${item.id}`,
      tipo: 'ingreso',
      categoria: item.tipo === 'variable' ? 'Ingreso variable' : 'Ingreso fijo',
      concepto: item.description,
      monto: item.amountUSD * trmRate,
      medio: item.source || '—',
      fecha,
    })
  })

  state.variableExpenses.forEach((item) => {
    const fecha = item.date.slice(0, 10)
    if (fecha < from || fecha > to) return
    rows.push({
      id: `variable-${item.id}`,
      tipo: 'gasto',
      categoria: item.categoria || 'Variable',
      concepto: item.description,
      monto: item.amount,
      medio: item.paymentMethod || '—',
      fecha,
    })
  })

  state.recurringTransactions.forEach((item) => {
    if (item.fecha < from || item.fecha > to) return
    const isIncome = item.tipo === 'ingreso'
    rows.push({
      id: `recurring-${item.id}`,
      tipo: isIncome ? 'ingreso' : 'gasto',
      categoria: item.categoria,
      concepto: item.concepto,
      monto: isIncome ? item.monto * trmRate : item.monto,
      fecha: item.fecha,
    })
  })

  state.pockets.forEach((pocket) => {
    pocket.historialAportes.forEach((aporte) => {
      if (aporte.fecha < from || aporte.fecha > to) return
      rows.push({
        id: `pocket-${pocket.id}-${aporte.id}`,
        tipo: 'aporte',
        categoria: `Bolsillo: ${pocket.nombre}`,
        concepto: aporte.concepto,
        monto: aporte.monto,
        fecha: aporte.fecha,
      })
    })
  })

  monthsBetween(from, to).forEach((monthKey) => {
    state.fixedExpenses.forEach((expense) => {
      if (expense.amount > 0) {
        rows.push({
          id: `fixed-${expense.id}-${monthKey}`,
          tipo: 'gasto',
          categoria: expense.name,
          concepto: expense.name,
          monto: expense.amount,
          medio: expense.paymentMethod || '—',
          fecha: `${monthKey}-01`,
        })
      }
    })

    state.debts.forEach((debt) => {
      const cuota = debt.cuotas.find((item) => item.mes === monthKey)
      if (cuota) {
        rows.push({
          id: `debt-${debt.id}-${cuota.numero}`,
          tipo: 'gasto',
          categoria: 'Deuda',
          concepto: debt.nombre,
          monto: cuota.montoEsperado,
          medio: '—',
          fecha: `${monthKey}-01`,
        })
      }
    })
  })

  return rows.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export function summarizeTransactions(rows) {
  const totalIngresos = rows.filter((r) => r.tipo === 'ingreso').reduce((sum, r) => sum + r.monto, 0)
  const totalGastos = rows.filter((r) => r.tipo === 'gasto').reduce((sum, r) => sum + r.monto, 0)
  const totalAportes = rows.filter((r) => r.tipo === 'aporte').reduce((sum, r) => sum + r.monto, 0)
  return { totalIngresos, totalGastos, totalAportes, neto: totalIngresos - totalGastos }
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function monthBounds(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  }
}

export function currentMonthRange() {
  return monthBounds(new Date())
}

export function lastMonthRange() {
  const now = new Date()
  return monthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1))
}

export function currentYearRange() {
  const year = new Date().getFullYear()
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

/** Source transfers (SourceTransferManager.jsx conversions) whose date falls within [from, to]. */
export function filterSourceTransfers(sourceTransfers, { from, to }) {
  return sourceTransfers
    .filter((transfer) => transfer.date >= from && transfer.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Aggregate stats for a set of source transfers: totals converted, and a weighted-average effective
 * rate (COP-weighted, not a plain average of per-transfer rates, so a single large conversion isn't
 * diluted by several small ones) compared against the average TRM those transfers were logged against.
 */
export function summarizeSourceTransfers(rows) {
  const totalUSD = rows.reduce((sum, r) => sum + r.amountUSD, 0)
  const totalCOP = rows.reduce((sum, r) => sum + r.amountCOP, 0)
  const avgEffectiveRate = totalUSD > 0 ? totalCOP / totalUSD : 0
  const trmWeightedSum = rows.reduce((sum, r) => sum + (r.trmRateSnapshot || 0) * r.amountUSD, 0)
  const avgTrmRate = totalUSD > 0 ? trmWeightedSum / totalUSD : 0
  const deltaPct = avgTrmRate > 0 ? (avgEffectiveRate - avgTrmRate) / avgTrmRate : null
  return { count: rows.length, totalUSD, totalCOP, avgEffectiveRate, avgTrmRate, deltaPct }
}

/** Top categories by spend within `rows` (gasto rows only), folding the rest into "Otros". */
export function categoryBreakdown(rows, maxCategories = 4) {
  const totals = new Map()
  rows
    .filter((r) => r.tipo === 'gasto')
    .forEach((r) => totals.set(r.categoria, (totals.get(r.categoria) || 0) + r.monto))

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, maxCategories)
  const restTotal = sorted.slice(maxCategories).reduce((sum, [, value]) => sum + value, 0)

  const breakdown = top.map(([categoria, value]) => ({ categoria, value }))
  if (restTotal > 0) breakdown.push({ categoria: 'Otros', value: restTotal })
  return breakdown
}
