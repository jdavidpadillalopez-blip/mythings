import { generarTransaccionesDesdeRegla } from './recurring'

// Clamped-to-month-length day of `mes` matching the debt's original day-of-month (fechaInicio) —
// same "same day each month, clamped at the short months" idea as monthlyOccurrences in recurring.js.
// Debts don't store a due-day of their own, so this derives one instead of showing cuotas dateless.
function cuotaDueDate(fechaInicio, mes) {
  const day = Number(fechaInicio?.split('-')[2]) || 1
  const [year, month] = mes.split('-').map(Number)
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  return `${mes}-${String(Math.min(day, lastDayOfMonth)).padStart(2, '0')}`
}

/**
 * Builds one flat list of dated events for `monthKey` ('YYYY-MM'): income received, recurring-rule
 * occurrences (split into already-generated "ejecutado" vs projected-but-not-yet-due "esperado", by
 * checking which ids already exist in recurringTransactions), debt installments due/paid, and
 * source-transfer movements. This is the single source of truth behind ActivityCalendar.jsx.
 */
export function buildCalendarEvents(state, monthKey) {
  const events = []
  const [year, month] = monthKey.split('-').map(Number)
  const monthStart = `${monthKey}-01`
  const monthEnd = `${monthKey}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

  state.incomes.forEach((income) => {
    const fecha = income.date.slice(0, 10)
    if (fecha < monthStart || fecha > monthEnd) return
    events.push({
      date: fecha,
      type: 'ingreso-ejecutado',
      label: income.description,
      amount: income.amountUSD,
      unit: 'USD',
    })
  })

  const existingIds = new Set(state.recurringTransactions.map((tx) => tx.id))
  state.recurringRules
    .filter((rule) => !rule.pausada)
    .forEach((rule) => {
      generarTransaccionesDesdeRegla(rule, monthEnd)
        .filter((tx) => tx.fecha >= monthStart && tx.fecha <= monthEnd)
        .forEach((tx) => {
          const isIncome = tx.tipo === 'ingreso'
          const executed = existingIds.has(tx.id)
          events.push({
            date: tx.fecha,
            type: executed
              ? isIncome
                ? 'ingreso-ejecutado'
                : 'gasto-ejecutado'
              : isIncome
                ? 'ingreso-esperado'
                : 'gasto-esperado',
            label: rule.concepto,
            amount: tx.monto,
            unit: isIncome ? 'USD' : 'COP',
          })
        })
    })

  state.debts.forEach((debt) => {
    debt.cuotas
      .filter((cuota) => cuota.mes === monthKey)
      .forEach((cuota) => {
        const date = cuota.fechaPago ? cuota.fechaPago.slice(0, 10) : cuotaDueDate(debt.fechaInicio, cuota.mes)
        events.push({
          date,
          type:
            cuota.estado === 'pagada' ? 'deuda-pagada' : cuota.estado === 'atrasada' ? 'deuda-atrasada' : 'deuda-pendiente',
          label: `${debt.nombre} (cuota ${cuota.numero}/${debt.numeroCuotasTotal})`,
          amount: cuota.montoEsperado,
          unit: 'COP',
        })
      })
  })

  state.sourceTransfers.forEach((transfer) => {
    if (transfer.date < monthStart || transfer.date > monthEnd) return
    events.push({
      date: transfer.date,
      type: 'conversion',
      label: `${transfer.fromSource} → ${transfer.toSource}`,
      amount: transfer.amountCOP,
      unit: 'COP',
    })
  })

  return events.sort((a, b) => a.date.localeCompare(b.date))
}
