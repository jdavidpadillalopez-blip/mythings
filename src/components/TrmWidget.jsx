import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, PenLine, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatDate } from '../utils/format'
import { todayISODate } from '../utils/debts'
import Skeleton from './Skeleton'
import TrmHistoryChart from './TrmHistoryChart'

// Official TRM (Tasa Representativa del Mercado), as calculated daily by the Superintendencia
// Financiera de Colombia and published via the government's open-data portal — not a live market
// rate. Dataset id 32sa-8pi3, the same one the community `trm-api` npm package wraps.
const TRM_OFICIAL_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json'
// Fallback only: if the government portal is unreachable, this gives a current market rate instead
// of leaving the user with a stale number — clearly labeled as such (not the official TRM) wherever
// it's shown.
const TRM_MERCADO_URL = 'https://open.er-api.com/v6/latest/USD'

function isoDateDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Fetches the official TRM. Queries a trailing window instead of asking Socrata to sort-and-limit
// server-side — empirically, `$order=vigenciadesde DESC&$limit=1` against this dataset sometimes
// returns a stale row (observed returning a three-week-old value while newer rows clearly existed),
// so the latest valid entry is picked here in JS instead of trusting the API's own ordering.
async function fetchTrmOficial() {
  const today = todayISODate()
  const since = isoDateDaysAgo(20)
  const params = new URLSearchParams({ $where: `vigenciadesde >= '${since}'` })
  const response = await fetch(`${TRM_OFICIAL_URL}?${params.toString()}`)
  if (!response.ok) throw new Error('Respuesta no válida del portal de datos abiertos')
  const rows = await response.json()
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Sin datos recientes de TRM oficial')

  // A TRM entry stays valid from vigenciadesde through vigenciahasta (it doesn't change on weekends
  // or holidays, so a Friday's entry can cover through the following Monday) — find the one whose
  // window actually contains today; if today's isn't published yet, fall back to the most recent one.
  const covering = rows.find((row) => row.vigenciadesde.slice(0, 10) <= today && today <= row.vigenciahasta.slice(0, 10))
  const mostRecent = rows.reduce(
    (latest, row) => (!latest || row.vigenciadesde > latest.vigenciadesde ? row : latest),
    null,
  )
  const rate = Number((covering ?? mostRecent)?.valor)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('El portal no devolvió un valor de TRM válido')
  return rate
}

async function fetchTrmMercado() {
  const response = await fetch(TRM_MERCADO_URL)
  if (!response.ok) throw new Error('Respuesta no válida de la API de mercado')
  const data = await response.json()
  const rate = data?.rates?.COP
  if (!rate) throw new Error('La API no devolvió una tasa COP')
  return rate
}

// 'api' is a legacy value from before the official-TRM source existed — kept here so states saved
// before this change still show a sensible label instead of falling through to "Manual".
const SOURCE_LABELS = {
  'api-oficial': 'Automática · TRM oficial',
  'api-mercado': 'Automática · tasa de mercado (respaldo)',
  api: 'Automática · tasa de mercado',
  manual: 'Manual',
}

export default function TrmWidget() {
  const { state, dispatch } = useApp()
  const { trm } = state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [manualValue, setManualValue] = useState(trm.rate)
  const [manualError, setManualError] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [flash, setFlash] = useState(false)

  // Briefly highlights the TRM number whenever it changes, so a manual/API update reads as confirmed.
  useEffect(() => {
    if (!trm.lastUpdated) return
    setFlash(true)
    const timeout = setTimeout(() => setFlash(false), 900)
    return () => clearTimeout(timeout)
  }, [trm.rate, trm.lastUpdated])

  async function fetchTrm() {
    setLoading(true)
    setError(null)
    try {
      const rate = await fetchTrmOficial()
      dispatch({
        type: 'SET_TRM',
        payload: { rate, lastUpdated: new Date().toISOString(), source: 'api-oficial' },
      })
      setManualValue(rate)
    } catch {
      // The government open-data portal occasionally has outages or replication gaps — fall back to
      // a live market rate rather than leaving the user stuck with a stale number, but label it
      // clearly as a fallback (not the official TRM) both in `source` and in the error shown below.
      try {
        const rate = await fetchTrmMercado()
        dispatch({
          type: 'SET_TRM',
          payload: { rate, lastUpdated: new Date().toISOString(), source: 'api-mercado' },
        })
        setManualValue(rate)
        setError('No se pudo obtener la TRM oficial — se usó una tasa de mercado como respaldo.')
      } catch {
        setError('No se pudo obtener la TRM automáticamente (ni la oficial ni el respaldo). Usa la actualización manual.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    const rate = Number(manualValue)
    if (!Number.isFinite(rate) || rate <= 0) {
      setManualError('Ingresa un valor numérico mayor que 0')
      return
    }
    setManualError(null)
    dispatch({
      type: 'SET_TRM',
      payload: { rate, lastUpdated: new Date().toISOString(), source: 'manual' },
    })
    setShowManual(false)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">TRM USD → COP</p>
          {loading ? (
            <Skeleton className="mt-1 h-8 w-32" />
          ) : (
            <motion.p
              key={trm.rate}
              initial={{ opacity: 0.4, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={`text-2xl font-semibold transition-colors duration-700 ${
                flash ? 'text-emerald-300' : 'text-slate-50'
              }`}
            >
              {formatCOP(trm.rate)}
            </motion.p>
          )}
          <p className="text-xs text-slate-500">
            {SOURCE_LABELS[trm.source] ?? 'Manual'}
            {trm.lastUpdated ? ` · actualizada ${formatDate(trm.lastUpdated)}` : ''}
          </p>
          {error && <p className="mt-1 text-xs text-orange-400">{error}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTrm}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowManual((v) => !v)
              setManualError(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors duration-200 hover:border-slate-500 hover:bg-slate-800/60"
          >
            <PenLine size={16} />
            Manual
          </button>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors duration-200 hover:border-slate-500 hover:bg-slate-800/60"
            aria-expanded={showHistory}
          >
            Ver histórico
            <motion.span animate={{ rotate: showHistory ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={16} />
            </motion.span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showManual && (
          <motion.form
            key="manual-form"
            onSubmit={handleManualSubmit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualValue}
                  onChange={(e) => {
                    setManualValue(e.target.value)
                    if (manualError) setManualError(null)
                  }}
                  className={`w-32 rounded-lg border bg-slate-950 px-2 py-1.5 text-sm text-slate-100 transition-colors duration-200 outline-none ${
                    manualError
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                      : 'border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                  }`}
                  placeholder="Ej: 4050"
                />
                {manualError && <p className="mt-1 text-xs text-red-400">{manualError}</p>}
              </div>
              <button
                type="submit"
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-slate-600"
              >
                Fijar TRM
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showHistory && (
          <motion.div
            key="history-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-slate-800 pt-4">
              <TrmHistoryChart trm={trm} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
