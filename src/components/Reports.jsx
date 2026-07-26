import { useMemo, useState } from 'react'
import { Printer, FileBarChart, ArrowRightLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApp } from '../context/AppContext'
import { formatCOP, formatUSD, formatDate } from '../utils/format'
import {
  buildUnifiedTransactions,
  summarizeTransactions,
  categoryBreakdown,
  filterSourceTransfers,
  summarizeSourceTransfers,
  currentMonthRange,
  lastMonthRange,
  currentYearRange,
} from '../utils/reports'
import DataTable from './DataTable'
import MoneyFlowBreakdown from './MoneyFlowBreakdown'
import ErrorBoundary from './ErrorBoundary'
import useSortablePaginatedList from '../hooks/useSortablePaginatedList'

const TIPO_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'ingreso', label: 'Ingresos' },
  { value: 'gasto', label: 'Gastos' },
  { value: 'aporte', label: 'Aportes a bolsillos' },
]

// Reuses the same validated categorical hues as ExpenseChart.jsx (blue/red/gold/green) plus a neutral
// gray for the folded "Otros" bucket, instead of introducing new unvalidated colors for this chart.
const CATEGORY_COLORS = ['#3987e5', '#e66767', '#c98500', '#008300', '#64748b']

export default function Reports() {
  const { state } = useApp()
  const [range, setRange] = useState(currentMonthRange())
  const [tipo, setTipo] = useState('todos')
  const [categoria, setCategoria] = useState('')
  const [texto, setTexto] = useState('')

  const allRows = useMemo(() => buildUnifiedTransactions(state, range), [state, range])

  const filteredRows = useMemo(() => {
    const search = texto.trim().toLowerCase()
    return allRows.filter((row) => {
      if (tipo !== 'todos' && row.tipo !== tipo) return false
      if (categoria && row.categoria !== categoria) return false
      if (search && !row.concepto.toLowerCase().includes(search)) return false
      return true
    })
  }, [allRows, tipo, categoria, texto])

  const summary = useMemo(() => summarizeTransactions(filteredRows), [filteredRows])
  const breakdown = useMemo(() => categoryBreakdown(filteredRows), [filteredRows])
  const transferRows = useMemo(
    () => filterSourceTransfers(state.sourceTransfers, range),
    [state.sourceTransfers, range],
  )
  const transferSummary = useMemo(() => summarizeSourceTransfers(transferRows), [transferRows])
  const barData = [
    { name: 'Ingresos', valor: summary.totalIngresos },
    { name: 'Gastos', valor: summary.totalGastos },
  ]

  const table = useSortablePaginatedList(filteredRows, { defaultSortColumn: 'fecha', pageSize: 10 })

  const categoryOptions = [...new Set(allRows.map((row) => row.categoria))].sort()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:hidden">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
          <FileBarChart size={16} />
          Reportes
        </h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          <Printer size={16} />
          Exportar a PDF
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:hidden">
        {[
          { label: 'Mes actual', getRange: currentMonthRange },
          { label: 'Mes pasado', getRange: lastMonthRange },
          { label: 'Año actual', getRange: currentYearRange },
        ].map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            onClick={() => setRange(shortcut.getRange())}
            className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors duration-200 hover:border-slate-500"
          >
            {shortcut.label}
          </button>
        ))}
        <input
          type="date"
          value={range.from}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
        />
        <span className="text-xs text-slate-500">a</span>
        <input
          type="date"
          value={range.to}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
        />

        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
        >
          {TIPO_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
        >
          <option value="">Todas las categorías</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar concepto…"
          className="min-w-[160px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
        />
      </div>

      <div id="print-report" className="flex flex-col gap-4">
        <div className="hidden text-center print:block">
          <h1 className="text-xl font-bold">Reporte financiero</h1>
          <p className="text-sm text-slate-600">
            {formatDate(range.from)} — {formatDate(range.to)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-emerald-900/60 bg-slate-950/60 px-3 py-2 print:border-slate-300">
            <p className="text-xs text-slate-500">Ingresos</p>
            <p className="text-sm font-semibold text-emerald-400 print:text-black">
              {formatCOP(summary.totalIngresos)}
            </p>
          </div>
          <div className="rounded-lg border border-red-900/60 bg-slate-950/60 px-3 py-2 print:border-slate-300">
            <p className="text-xs text-slate-500">Gastos</p>
            <p className="text-sm font-semibold text-red-400 print:text-black">
              {formatCOP(summary.totalGastos)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 print:border-slate-300">
            <p className="text-xs text-slate-500">Neto</p>
            <p className="text-sm font-semibold text-slate-100 print:text-black">{formatCOP(summary.neto)}</p>
          </div>
          <div className="rounded-lg border border-blue-900/60 bg-slate-950/60 px-3 py-2 print:border-slate-300">
            <p className="text-xs text-slate-500">Aportes a bolsillos</p>
            <p className="text-sm font-semibold text-blue-400 print:text-black">
              {formatCOP(summary.totalAportes)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Ingresos vs. gastos
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                    tickFormatter={(v) => formatCOP(v).replace('COP', '').trim()}
                  />
                  <RTooltip
                    formatter={(value) => formatCOP(value)}
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    <Cell fill="#34d399" />
                    <Cell fill="#f87171" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Gastos por categoría
            </h3>
            {breakdown.length === 0 ? (
              <p className="py-14 text-center text-sm text-slate-500">Sin gastos en el rango filtrado.</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown} dataKey="value" nameKey="categoria" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                      {breakdown.map((entry, i) => (
                        <Cell key={entry.categoria} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip
                      formatter={(value) => formatCOP(value)}
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              {breakdown.map((entry, i) => (
                <li key={entry.categoria} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  />
                  {entry.categoria}: {formatCOP(entry.value)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <ArrowRightLeft size={14} />
            Conversiones entre fuentes ({transferRows.length})
          </h3>

          {transferRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              Sin conversiones entre fuentes en el rango filtrado.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-cyan-900/60 bg-slate-950/60 px-3 py-2 print:border-slate-300">
                  <p className="text-xs text-slate-500">Total convertido</p>
                  <p className="text-sm font-semibold text-cyan-400 print:text-black">
                    {formatUSD(transferSummary.totalUSD)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 print:border-slate-300">
                  <p className="text-xs text-slate-500">COP recibidos</p>
                  <p className="text-sm font-semibold text-slate-100 print:text-black">
                    {formatCOP(transferSummary.totalCOP)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 print:border-slate-300">
                  <p className="text-xs text-slate-500">Tasa efectiva promedio</p>
                  <p className="text-sm font-semibold text-slate-100 print:text-black">
                    {formatCOP(transferSummary.avgEffectiveRate)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 print:border-slate-300">
                  <p className="text-xs text-slate-500">Vs. TRM promedio</p>
                  <p
                    className={`text-sm font-semibold print:text-black ${
                      transferSummary.deltaPct !== null && transferSummary.deltaPct < 0
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {transferSummary.deltaPct === null
                      ? '—'
                      : `${transferSummary.deltaPct >= 0 ? '+' : ''}${(transferSummary.deltaPct * 100).toFixed(1)}%`}
                  </p>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-800 print:hidden">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80">
                      <th className="px-3 py-2 text-left font-medium text-slate-400">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">Ruta</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">USD</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">COP recibidos</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">Tasa efectiva</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferRows.map((row) => {
                      const rate = row.amountCOP / row.amountUSD
                      const delta = row.trmRateSnapshot > 0 ? (rate - row.trmRateSnapshot) / row.trmRateSnapshot : null
                      return (
                        <tr key={row.id} className="border-b border-slate-800/60 last:border-0">
                          <td className="px-3 py-2 text-slate-200">{formatDate(row.date)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-200">
                            {row.fromSource} <span className="text-slate-600">→</span> {row.toSource}
                          </td>
                          <td className="px-3 py-2 text-slate-200">{formatUSD(row.amountUSD)}</td>
                          <td className="px-3 py-2 text-slate-200">{formatCOP(row.amountCOP)}</td>
                          <td className="px-3 py-2 text-slate-200">
                            {formatCOP(rate)}
                            {delta !== null && (
                              <span className={`ml-1 text-xs ${delta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                ({delta >= 0 ? '+' : ''}
                                {(delta * 100).toFixed(1)}%)
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <table className="hidden w-full text-xs print:table">
                <thead>
                  <tr className="border-b border-slate-400 text-left">
                    <th className="py-1 pr-2">Fecha</th>
                    <th className="py-1 pr-2">Ruta</th>
                    <th className="py-1 pr-2">USD</th>
                    <th className="py-1 pr-2 text-right">COP recibidos</th>
                    <th className="py-1 pr-2 text-right">Tasa efectiva</th>
                  </tr>
                </thead>
                <tbody>
                  {transferRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-300">
                      <td className="py-1 pr-2">{formatDate(row.date)}</td>
                      <td className="py-1 pr-2">
                        {row.fromSource} → {row.toSource}
                      </td>
                      <td className="py-1 pr-2">{formatUSD(row.amountUSD)}</td>
                      <td className="py-1 pr-2 text-right">{formatCOP(row.amountCOP)}</td>
                      <td className="py-1 pr-2 text-right">{formatCOP(row.amountCOP / row.amountUSD)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <ErrorBoundary>
          <MoneyFlowBreakdown />
        </ErrorBoundary>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Movimientos ({filteredRows.length})
          </h3>

          <div className="print:hidden">
            <DataTable
              columns={[
                { key: 'fecha', label: 'Fecha', render: (row) => formatDate(row.fecha) },
                { key: 'tipo', label: 'Tipo' },
                { key: 'categoria', label: 'Categoría' },
                { key: 'concepto', label: 'Concepto' },
                { key: 'medio', label: 'Medio', render: (row) => row.medio || '—' },
                { key: 'monto', label: 'Monto', render: (row) => formatCOP(row.monto) },
              ]}
              rows={table.sortedItems}
              sortColumn={table.sortColumn}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
              page={table.page}
              totalPages={table.totalPages}
              onPageChange={table.setPage}
              emptyMessage="No hay movimientos con estos filtros."
            />
          </div>

          {/* Printed reports show every filtered row on one continuous table, not just the current page. */}
          <table className="hidden w-full text-xs print:table">
            <thead>
              <tr className="border-b border-slate-400 text-left">
                <th className="py-1 pr-2">Fecha</th>
                <th className="py-1 pr-2">Tipo</th>
                <th className="py-1 pr-2">Categoría</th>
                <th className="py-1 pr-2">Concepto</th>
                <th className="py-1 pr-2">Medio</th>
                <th className="py-1 pr-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-300">
                  <td className="py-1 pr-2">{formatDate(row.fecha)}</td>
                  <td className="py-1 pr-2">{row.tipo}</td>
                  <td className="py-1 pr-2">{row.categoria}</td>
                  <td className="py-1 pr-2">{row.concepto}</td>
                  <td className="py-1 pr-2">{row.medio || '—'}</td>
                  <td className="py-1 pr-2 text-right">{formatCOP(row.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
