import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, PenLine, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCOP, formatDate } from '../utils/format'
import Skeleton from './Skeleton'
import TrmHistoryChart from './TrmHistoryChart'

const TRM_API_URL = 'https://open.er-api.com/v6/latest/USD'

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
      const response = await fetch(TRM_API_URL)
      if (!response.ok) throw new Error('Respuesta no válida de la API')
      const data = await response.json()
      const rate = data?.rates?.COP
      if (!rate) throw new Error('La API no devolvió una tasa COP')
      dispatch({
        type: 'SET_TRM',
        payload: { rate, lastUpdated: new Date().toISOString(), source: 'api' },
      })
      setManualValue(rate)
    } catch {
      setError('No se pudo obtener la TRM automáticamente. Usa la actualización manual.')
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
            {trm.source === 'api' ? 'Automática' : 'Manual'}
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
