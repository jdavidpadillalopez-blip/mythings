import { useState } from 'react'
import PropTypes from 'prop-types'
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'

/** Generic sortable/paginated table — pairs with useSortablePaginatedList. Columns are config, not markup. */
export default function DataTable({
  columns,
  rows,
  sortColumn,
  sortDirection,
  onSort,
  page,
  totalPages,
  onPageChange,
  emptyMessage,
}) {
  const [jumpValue, setJumpValue] = useState('')

  function handleJump(e) {
    e.preventDefault()
    const target = Number(jumpValue)
    if (Number.isInteger(target) && target >= 1 && target <= totalPages) {
      onPageChange(target)
    }
    setJumpValue('')
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-left font-medium text-slate-400">
                  {column.sortable === false ? (
                    column.label
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className="inline-flex items-center gap-1 transition-colors duration-200 hover:text-slate-200"
                    >
                      {column.label}
                      {sortColumn === column.key &&
                        (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id ?? index}
                  className="border-b border-slate-800/60 transition-colors duration-150 last:border-0 hover:bg-slate-900/50"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 text-slate-200">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-md border border-slate-700 p-1.5 text-slate-300 transition-colors duration-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-slate-600">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`h-7 min-w-7 rounded-md px-2 transition-colors duration-200 ${
                    p === page
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {p}
                </button>
              ),
            )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-slate-700 p-1.5 text-slate-300 transition-colors duration-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página siguiente"
          >
            <ChevronRight size={14} />
          </button>

          {totalPages > 5 && (
            <form onSubmit={handleJump} className="ml-2 flex items-center gap-1">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                placeholder="Ir a…"
                className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
              />
            </form>
          )}
        </div>
      )}
    </div>
  )
}

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      sortable: PropTypes.bool,
      render: PropTypes.func,
    }),
  ).isRequired,
  rows: PropTypes.array.isRequired,
  sortColumn: PropTypes.string,
  sortDirection: PropTypes.oneOf(['asc', 'desc']),
  onSort: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  emptyMessage: PropTypes.string,
}

DataTable.defaultProps = {
  emptyMessage: 'No hay resultados.',
}
