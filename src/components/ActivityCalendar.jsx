import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { buildCalendarEvents } from '../utils/calendarEvents'
import { getMonthKey, addMonthsToMonthKey, todayISODate } from '../utils/debts'
import { formatCOP, formatUSD, formatMonthKey, formatDate } from '../utils/format'

// Executed events are solid dots; projected/expected ones are hollow rings in the same hue — same
// visual vocabulary as "esto ya pasó" vs "esto se espera" without needing a text label per dot.
const EVENT_META = {
  'ingreso-ejecutado': { dot: 'bg-emerald-500', label: 'Ingreso recibido' },
  'ingreso-esperado': { dot: 'border-2 border-emerald-500 bg-transparent', label: 'Ingreso esperado (recurrente)' },
  'gasto-ejecutado': { dot: 'bg-violet-500', label: 'Gasto recurrente ejecutado' },
  'gasto-esperado': { dot: 'border-2 border-violet-500 bg-transparent', label: 'Gasto recurrente esperado' },
  'deuda-pagada': { dot: 'bg-emerald-500', label: 'Cuota de deuda pagada' },
  'deuda-pendiente': { dot: 'bg-sky-500', label: 'Cuota de deuda pendiente' },
  'deuda-atrasada': { dot: 'bg-red-500', label: 'Cuota de deuda atrasada' },
  conversion: { dot: 'bg-cyan-500', label: 'Conversión entre fuentes' },
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** 6x7 grid of 'YYYY-MM-DD' strings for `monthKey`, padded with `null` before day 1 and after the
 * last day so every row has 7 cells and weekday columns line up with WEEKDAYS. */
function buildMonthGrid(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const startOffset = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = Array(startOffset).fill(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${monthKey}-${String(day).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function ActivityCalendar() {
  const { state } = useApp()
  const [monthKey, setMonthKey] = useState(getMonthKey(new Date()))
  const [selectedDate, setSelectedDate] = useState(null)

  const events = useMemo(() => buildCalendarEvents(state, monthKey), [state, monthKey])
  const eventsByDate = useMemo(() => {
    const map = new Map()
    events.forEach((event) => {
      if (!map.has(event.date)) map.set(event.date, [])
      map.get(event.date).push(event)
    })
    return map
  }, [events])

  const cells = useMemo(() => buildMonthGrid(monthKey), [monthKey])
  const todayStr = todayISODate()
  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : []

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
          <CalendarDays size={16} />
          Calendario de movimientos
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMonthKey((m) => addMonthsToMonthKey(m, -1))
              setSelectedDate(null)
            }}
            className="rounded-md border border-slate-700 p-1 text-slate-300 transition-colors duration-200 hover:border-slate-500"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-[110px] text-center text-xs capitalize text-slate-400">
            {formatMonthKey(monthKey)}
          </span>
          <button
            type="button"
            onClick={() => {
              setMonthKey((m) => addMonthsToMonthKey(m, 1))
              setSelectedDate(null)
            }}
            className="rounded-md border border-slate-700 p-1 text-slate-300 transition-colors duration-200 hover:border-slate-500"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-slate-500">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />
          const dayEvents = eventsByDate.get(date) ?? []
          const dayNumber = Number(date.slice(-2))
          const isToday = date === todayStr
          const isSelected = date === selectedDate
          return (
            <button
              type="button"
              key={date}
              onClick={() => setSelectedDate(isSelected ? null : date)}
              className={`flex h-16 flex-col items-center gap-1 rounded-lg border p-1 pt-1.5 text-xs transition-colors duration-150 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : isToday
                    ? 'border-slate-600 bg-slate-800/60'
                    : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              <span className={isToday ? 'font-semibold text-emerald-400' : 'text-slate-300'}>{dayNumber}</span>
              <div className="flex flex-wrap items-center justify-center gap-0.5">
                {dayEvents.slice(0, 4).map((event, i) => (
                  <span key={i} className={`h-1.5 w-1.5 shrink-0 rounded-full ${EVENT_META[event.type].dot}`} />
                ))}
                {dayEvents.length > 4 && <span className="text-[9px] text-slate-500">+{dayEvents.length - 4}</span>}
              </div>
            </button>
          )
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-800 pt-2 text-[10px] text-slate-500">
        {Object.entries(EVENT_META).map(([key, meta]) => (
          <li key={key} className="flex items-center gap-1">
            <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
            {meta.label}
          </li>
        ))}
      </ul>

      {selectedDate && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="mb-2 text-xs font-semibold capitalize text-slate-300">{formatDate(selectedDate)}</p>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-slate-500">Sin movimientos este día.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {selectedEvents.map((event, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${EVENT_META[event.type].dot}`} />
                    {event.label}
                  </span>
                  <span className="shrink-0 font-medium text-slate-200">
                    {event.unit === 'USD' ? formatUSD(event.amount) : formatCOP(event.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
