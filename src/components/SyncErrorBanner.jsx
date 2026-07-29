import { useEffect, useState } from 'react'
import { CloudOff, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

/**
 * A sync failure (e.g. OneDrive quota full, expired session) used to only surface as small text
 * inside the Datos tab's SyncPanel — invisible while adding data anywhere else, which is exactly
 * what made a real quota-full error look like "my data keeps disappearing" instead of what it
 * actually was: pushes silently failing while local edits kept getting overwritten by the last
 * backup that *did* save. This banner surfaces the same `sync.error` from anywhere in the app.
 */
export default function SyncErrorBanner() {
  const { sync } = useApp()
  const [dismissedError, setDismissedError] = useState(null)

  const active = sync.connected && sync.status === 'error' && sync.error
  const visible = active && sync.error !== dismissedError

  // A fresh error (different message) always reappears even if a previous one was dismissed.
  useEffect(() => {
    if (!active) setDismissedError(null)
  }, [active])

  if (!visible) return null

  return (
    <div className="border-b border-amber-900/60 bg-amber-950/40 px-4 py-2 print:hidden">
      <div className="mx-auto flex max-w-6xl items-start gap-2 text-xs text-amber-200">
        <CloudOff size={14} className="mt-0.5 shrink-0" />
        <p className="flex-1">
          <span className="font-medium">No se pudo sincronizar con OneDrive:</span> {sync.error} Tus
          cambios siguen guardados en este navegador, pero no se están respaldando en la nube hasta
          que esto se resuelva — revisa el espacio disponible en tu OneDrive o la pestaña "Datos".
        </p>
        <button
          type="button"
          onClick={() => setDismissedError(sync.error)}
          className="shrink-0 text-amber-400 transition-colors duration-200 hover:text-amber-200"
          aria-label="Cerrar aviso"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
