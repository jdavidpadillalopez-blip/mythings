// Reads/writes the app's backup JSON to a dedicated app-only folder in the user's OneDrive via
// Microsoft Graph's "special/approot" path — a convenience alias Graph resolves to a per-app folder
// it creates automatically (visible to the user as "Apps/Finanzas USD-COP" in their OneDrive), scoped
// to exactly the Files.ReadWrite.AppFolder permission requested during login (see msAuth.js). The app
// never sees or touches any other file in the user's drive.
import { getAccessToken } from './msAuth'

const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0'
const BACKUP_FILENAME = 'finanzas-backup.json'

async function graphRequest(path, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${GRAPH_ROOT}${path}`, {
    // Without this, the browser's own HTTP cache can serve a stale response for a GET to the same
    // URL (e.g. the backup file's /content endpoint) instead of hitting the network — meaning a pull
    // right after a successful push could still read back pre-push content. A sync feature must
    // always see what's actually on the server right now, so caching is disabled unconditionally.
    cache: 'no-store',
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  return res
}

async function graphErrorDetail(res) {
  const body = await res.json().catch(() => null)
  return body?.error?.message ? ` — ${body.error.message}` : ''
}

// On a brand-new app registration, the "Apps/<app name>" folder behind the special/approot alias
// doesn't exist in the user's OneDrive until something provisions it. Graph is supposed to
// auto-create it lazily, but in practice a PUT to a colon-addressed path *inside* approot
// (`/special/approot:/file:/content`) can 404 if the approot item itself was never touched first —
// the parent the colon path resolves against isn't there yet. A plain GET on `/special/approot`
// (no colon path) creates it as a side effect, so doing that once before the first write sidesteps
// the whole class of "404 on first-ever push" bugs. Cheap to call every time; a no-op once it exists.
let approotEnsured = false
async function ensureAppRootFolder() {
  if (approotEnsured) return
  const res = await graphRequest('/me/drive/special/approot')
  if (!res.ok) {
    const detail = await graphErrorDetail(res)
    throw new Error(`No se pudo preparar la carpeta de la app en OneDrive (${res.status})${detail}.`)
  }
  approotEnsured = true
}

/** Basic profile info, used to show "conectado como ..." in the UI. */
export async function fetchProfile() {
  const res = await graphRequest('/me?$select=displayName,mail,userPrincipalName')
  if (!res.ok) throw new Error('No se pudo obtener tu perfil de Microsoft.')
  return res.json()
}

/**
 * Reads the backup file from the app folder. Returns null if it doesn't exist yet (first-ever
 * login on any device, before anything has been pushed) rather than throwing — callers treat that
 * as "nothing to pull" instead of an error.
 */
export async function readBackup() {
  await ensureAppRootFolder()
  const res = await graphRequest(`/me/drive/special/approot:/${BACKUP_FILENAME}:/content`)
  if (res.status === 404) return null
  if (!res.ok) {
    const detail = await graphErrorDetail(res)
    throw new Error(`No se pudo leer el respaldo en OneDrive (${res.status})${detail}.`)
  }
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

/** Overwrites (or creates, on first push) the backup file with the given payload. */
export async function writeBackup(payload) {
  await ensureAppRootFolder()
  const res = await graphRequest(`/me/drive/special/approot:/${BACKUP_FILENAME}:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const detail = await graphErrorDetail(res)
    throw new Error(`No se pudo guardar el respaldo en OneDrive (${res.status})${detail}.`)
  }
  const data = await res.json()
  return data.lastModifiedDateTime
}

/** Metadata only (no content) — used to compare "who has the newer copy" before overwriting. */
export async function fetchBackupMeta() {
  await ensureAppRootFolder()
  const res = await graphRequest(`/me/drive/special/approot:/${BACKUP_FILENAME}`)
  if (res.status === 404) return null
  if (!res.ok) {
    const detail = await graphErrorDetail(res)
    throw new Error(`No se pudo consultar el respaldo en OneDrive (${res.status})${detail}.`)
  }
  const data = await res.json()
  return { lastModifiedDateTime: data.lastModifiedDateTime }
}
