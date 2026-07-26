// Cross-device sync piggybacks on a private GitHub Gist instead of standing up a real backend:
// the user already has a GitHub account (they used one to deploy this site), so this reuses that
// rather than asking them to create yet another account with yet another service. It's a manual
// "push from one device, pull on the other" model, not automatic real-time sync — there's no server
// component here to push notifications from, just a JSON blob living in a gist.
const GIST_FILENAME = 'finanzas-usd-cop-backup.json'
const GIST_DESCRIPTION = 'Respaldo de datos — Finanzas USD → COP (generado por la app, no editar a mano)'

async function githubRequest(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (res.status === 401) throw new Error('El token no es válido o ya no tiene permiso (revísalo en GitHub).')
    if (res.status === 404) throw new Error('No se encontró ese respaldo en la nube — puede que el gist se haya borrado.')
    throw new Error(body?.message || `GitHub respondió con un error (${res.status}).`)
  }
  return res.json()
}

/** Creates a new private gist holding the backup and returns its id. */
export async function createGist(token, contentString) {
  const data = await githubRequest('https://api.github.com/gists', token, {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content: contentString } },
    }),
  })
  return data.id
}

/** Overwrites the existing gist's content with a fresh export. */
export async function updateGist(token, gistId, contentString) {
  const data = await githubRequest(`https://api.github.com/gists/${gistId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILENAME]: { content: contentString } } }),
  })
  return data.updated_at
}

/** Fetches the gist and returns its parsed JSON content plus when it was last pushed. */
export async function fetchGist(token, gistId) {
  const data = await githubRequest(`https://api.github.com/gists/${gistId}`, token)
  const file = data.files[GIST_FILENAME]
  if (!file) throw new Error('Ese gist no contiene el archivo de respaldo esperado.')
  // Gists truncate file content in the main response past ~1MB — this app's export is nowhere near
  // that, but falling back to raw_url costs nothing and avoids a silent partial-data bug if it ever is.
  const raw = file.truncated ? await fetch(file.raw_url).then((r) => r.text()) : file.content
  return { content: JSON.parse(raw), updatedAt: data.updated_at }
}
