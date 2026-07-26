// Payment-proof files (photos/PDFs of a receipt) live in IndexedDB, not localStorage: they can
// easily be a few hundred KB to a few MB each, which would blow through localStorage's ~5-10MB
// quota fast. Only small metadata about each proof ({ nombre, tipo, tamano }) is kept alongside the
// cuota itself in the debts_v2 localStorage slice (see utils/debts.js) — the actual file bytes are
// looked up here, keyed by proofKey(debtId, numero), only when the user wants to view/download one.
const DB_NAME = 'finanzas-comprobantes'
const STORE_NAME = 'comprobantes'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Este navegador no soporta almacenamiento de archivos (IndexedDB).'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function proofKey(debtId, numero) {
  return `${debtId}::${numero}`
}

export async function saveProofFile(key, file) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(file, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getProofFile(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

// Best-effort cleanup — called when a cuota is unmarked as paid, or a debt/its plan is regenerated.
// Failures here shouldn't block the state change the user actually asked for, so callers fire this
// without awaiting/blocking on it.
export async function deleteProofFile(key) {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // IndexedDB unavailable or already empty — nothing meaningful to do.
  }
}

/** Cleans up every stored proof for a debt being deleted entirely, so nothing orphaned lingers. */
export function deleteProofsForDebt(debt) {
  debt.cuotas
    .filter((cuota) => cuota.comprobante)
    .forEach((cuota) => deleteProofFile(proofKey(debt.id, cuota.numero)))
}

/** Opens a stored proof in a new tab so the user can view/download it. No-ops quietly if missing. */
export async function openProofFile(key) {
  const blob = await getProofFile(key)
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}
