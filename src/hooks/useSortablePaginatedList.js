import { useEffect, useMemo, useState } from 'react'

/**
 * Client-side sort + pagination for any array of plain objects. Sorting is generic (numbers compare
 * numerically, everything else falls back to locale string compare); pass `defaultSortColumn: null`
 * to leave the incoming order untouched until the user clicks a header.
 */
export default function useSortablePaginatedList(
  items,
  { defaultSortColumn = null, defaultSortDirection = 'desc', pageSize: initialPageSize = 10 } = {},
) {
  const [sortColumn, setSortColumn] = useState(defaultSortColumn)
  const [sortDirection, setSortDirection] = useState(defaultSortDirection)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const fullySorted = useMemo(() => {
    if (!sortColumn) return items
    const sorted = [...items].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1
      if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue
      return String(aValue).localeCompare(String(bValue))
    })
    return sortDirection === 'asc' ? sorted : sorted.reverse()
  }, [items, sortColumn, sortDirection])

  const totalPages = Math.max(1, Math.ceil(fullySorted.length / pageSize))
  const page_ = Math.min(page, totalPages)

  // Snap back to the last valid page if the filtered/sorted set shrank out from under the current page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const sortedItems = useMemo(() => {
    const start = (page_ - 1) * pageSize
    return fullySorted.slice(start, start + pageSize)
  }, [fullySorted, page_, pageSize])

  function toggleSort(column) {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setPage(1)
  }

  return {
    sortedItems,
    sortColumn,
    sortDirection,
    toggleSort,
    page: page_,
    totalPages,
    setPage,
    pageSize,
    setPageSize,
  }
}
