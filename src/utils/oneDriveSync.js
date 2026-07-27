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
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  return res
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
  const res = await graphRequest(`/me/drive/special/approot:/${BACKUP_FILENAME}:/content`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`No se pudo leer el respaldo en OneDrive (${res.status}).`)
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

/** Overwrites (or creates, on first push) the backup file with the given payload. */
export async function writeBackup(payload) {
  const res = await graphRequest(`/me/drive/special/approot:/${BACKUP_FILENAME}:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`No se pudo guardar el respaldo en OneDrive (${res.status}).`)
  const data = await res.json()
  return data.lastModifiedDateTime
}

/** Metadata only (no content) — used to compare "who has the newer copy" before overwriting. */
export async function fetchBackupMeta() {
  const res = await graphRequest(`/me/drive/special/approot:/${BACKUP_FILENAME}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`No se pudo consultar el respaldo en OneDrive (${res.status}).`)
  const data = await res.json()
  return { lastModifiedDateTime: data.lastModifiedDateTime }
}
