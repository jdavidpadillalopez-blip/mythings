import { useState } from 'react'
import { Cloud, UploadCloud, DownloadCloud, Loader2, KeyRound, Trash2 } from 'lucide-react'
import { useApp, isValidImportedState } from '../context/AppContext'
import { buildExportPayload } from '../utils/exportPayload'
import { createGist, updateGist, fetchGist, findExistingGist } from '../utils/githubSync'
import { formatDate } from '../utils/format'
import Modal from './Modal'

// Kept out of the reducer/localStorage-backed app state on purpose: the token is a credential, not
// app data, and app state is exactly what gets written into export files / gists — we don't want a
// user's own GitHub token accidentally riding along inside a JSON backup they might share. These
// live in their own localStorage keys instead, scoped to sync metadata only.
const TOKEN_KEY = 'finanzas-sync-token'
const GIST_ID_KEY = 'finanzas-sync-gist-id'
const LAST_PUSH_KEY = 'finanzas-sync-last-push'
const LAST_PULL_KEY = 'finanzas-sync-last-pull'

export default function SyncPanel() {
  const { state, dispatch } = useApp()
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [gistId, setGistId] = useState(() => localStorage.getItem(GIST_ID_KEY) ?? '')
  const [lastPush, setLastPush] = useState(() => localStorage.getItem(LAST_PUSH_KEY))
  const [lastPull, setLastPull] = useState(() => localStorage.getItem(LAST_PULL_KEY))
  const [tokenInput, setTokenInput] = useState(token)
  const [pushing, setPushing] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [pendingPull, setPendingPull] = useState(null)

  const hasToken = token.trim().length > 0

  function saveToken() {
    const trimmed = tokenInput.trim()
    setToken(trimmed)
    if (trimmed) localStorage.setItem(TOKEN_KEY, trimmed)
    else localStorage.removeItem(TOKEN_KEY)
    setMessage(trimmed ? 'Token guardado en este dispositivo.' : 'Token eliminado de este dispositivo.')
    setError(null)
  }

  function forgetToken() {
    setTokenInput('')
    setToken('')
    localStorage.removeItem(TOKEN_KEY)
    setMessage('Token eliminado de este dispositivo.')
  }

  // The gist id cached in localStorage only ever reflects what THIS device has seen — it might be
  // stale (this device never pushed/pulled yet) or simply absent on a second device. Before trusting
  // it, check GitHub itself for a matching gist under this token's account: that's the only source
  // both devices actually share. Caches whatever id it lands on so subsequent calls skip the lookup.
  async function resolveGistId() {
    if (gistId) return gistId
    const found = await findExistingGist(token)
    if (found) {
      localStorage.setItem(GIST_ID_KEY, found)
      setGistId(found)
    }
    return found
  }

  async function handlePush() {
    setPushing(true)
    setError(null)
    setMessage(null)
    try {
      const content = JSON.stringify(buildExportPayload(state), null, 2)
      const id = await resolveGistId()
      if (id) {
        const updatedAt = await updateGist(token, id, content)
        localStorage.setItem(LAST_PUSH_KEY, updatedAt)
        setLastPush(updatedAt)
      } else {
        const newId = await createGist(token, content)
        localStorage.setItem(GIST_ID_KEY, newId)
        setGistId(newId)
        const now = new Date().toISOString()
        localStorage.setItem(LAST_PUSH_KEY, now)
        setLastPush(now)
      }
      setMessage('Datos subidos a la nube correctamente.')
    } catch (err) {
      setError(err.message || 'No se pudo subir el respaldo.')
    } finally {
      setPushing(false)
    }
  }

  async function handlePullClick() {
    setPulling(true)
    setError(null)
    setMessage(null)
    try {
      const id = await resolveGistId()
      if (!id) {
        setError('Todavía no hay ningún respaldo en la nube con este token — usa "Subir a la nube" desde el otro dispositivo primero.')
        return
      }
      const { content, updatedAt } = await fetchGist(token, id)
      if (!isValidImportedState(content)) {
        setError('El respaldo en la nube no tiene el formato esperado de esta app.')
        return
      }
      setPendingPull({ content, updatedAt })
    } catch (err) {
      setError(err.message || 'No se pudo descargar el respaldo.')
    } finally {
      setPulling(false)
    }
  }

  function confirmPull() {
    dispatch({ type: 'IMPORT_STATE', payload: pendingPull.content })
    localStorage.setItem(LAST_PULL_KEY, pendingPull.updatedAt)
    setLastPull(pendingPull.updatedAt)
    setPendingPull(null)
    setMessage('Datos descargados de la nube correctamente.')
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
        <Cloud size={16} />
        Sincronización entre dispositivos
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Usa un Gist privado de tu propia cuenta de GitHub como punto de encuentro entre laptop y
        celular: subes desde un dispositivo, descargas en el otro. No es automático — tú decides
        cuándo sincronizar, y la última subida siempre reemplaza lo anterior.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Token de GitHub (permiso 'gist')"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors duration-200 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
        />
        <button
          type="button"
          onClick={saveToken}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors duration-200 hover:border-slate-500"
        >
          <KeyRound size={16} />
          Guardar token
        </button>
        {hasToken && (
          <button
            type="button"
            onClick={forgetToken}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-400 transition-colors duration-200 hover:border-red-500 hover:bg-red-950/30"
            aria-label="Olvidar token en este dispositivo"
            title="Olvidar token en este dispositivo"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handlePush}
          disabled={!hasToken || pushing}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600/90 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pushing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          Subir a la nube
        </button>
        <button
          type="button"
          onClick={handlePullClick}
          disabled={!hasToken || pulling}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors duration-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pulling ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
          Descargar de la nube
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>Última subida: {lastPush ? formatDate(lastPush) : 'nunca desde este dispositivo'}</span>
        <span>Última descarga: {lastPull ? formatDate(lastPull) : 'nunca en este dispositivo'}</span>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {message && <p className="mt-3 text-xs text-emerald-400">{message}</p>}

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
        <p className="mb-1 font-medium text-slate-400">Cómo conectar los dos dispositivos:</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            En github.com → Settings → Developer settings → Personal access tokens →{' '}
            <span className="text-slate-400">Tokens (classic)</span> → Generate new token, marca
            solo el permiso <span className="text-slate-400">gist</span> (nada más).
          </li>
          <li>Pega ese token aquí y en el otro dispositivo, y presiona "Guardar token" en ambos.</li>
          <li>
            En el primer dispositivo, presiona "Subir a la nube". En el segundo, presiona "Descargar
            de la nube".
          </li>
        </ol>
        <p className="mt-2">
          El token solo se guarda en este navegador y solo se usa para hablar con github.com — no
          pasa por ningún otro servidor. Los archivos de comprobantes (fotos/PDFs) no viajan en la
          sincronización, igual que en el respaldo local.
        </p>
      </div>

      <Modal
        open={!!pendingPull}
        onClose={() => setPendingPull(null)}
        title="Confirmar descarga"
        widthClassName="max-w-sm"
      >
        <p className="text-sm text-slate-300">
          Esto reemplazará todos tus datos actuales en este dispositivo por los del respaldo en la
          nube{pendingPull ? ` (subido ${formatDate(pendingPull.updatedAt)})` : ''}. Esta acción no se
          puede deshacer. ¿Deseas continuar?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setPendingPull(null)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors duration-200 hover:border-slate-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmPull}
            className="rounded-lg bg-cyan-600/90 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-cyan-500"
          >
            Sí, reemplazar
          </button>
        </div>
      </Modal>
    </div>
  )
}
