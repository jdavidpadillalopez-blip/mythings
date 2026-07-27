// Minimal OAuth2 Authorization Code + PKCE client for the Microsoft identity platform, hand-rolled
// instead of pulling in @azure/msal-browser. Reason: this app's sandbox build environment has no
// network access to the npm registry to regenerate package-lock.json for a new dependency, and
// `npm ci` (used by the deploy workflow) requires the lockfile to exactly match package.json. The
// underlying flow is a handful of stable, well-documented endpoints, so hand-rolling it is low risk:
// generate a PKCE pair, redirect to Microsoft's login page, exchange the returned code for tokens,
// then refresh silently as needed. A full-page redirect (not a popup) is used throughout since popups
// are unreliable on mobile browsers.
const CLIENT_ID = 'd2384443-0b5f-4be6-860a-f9ff1779ceac'
const AUTHORITY = 'https://login.microsoftonline.com/common/oauth2/v2.0'
// Files.ReadWrite.AppFolder scopes access to a single app-private folder in the user's OneDrive
// instead of the whole drive — see oneDriveSync.js.
const SCOPES = 'openid profile offline_access Files.ReadWrite.AppFolder'

const TOKENS_KEY = 'finanzas-ms-tokens'
// sessionStorage, not localStorage: this only needs to survive the redirect round-trip to Microsoft
// and back, not persist long-term.
const PKCE_KEY = 'finanzas-ms-pkce'

// Must exactly match the redirect URI registered in Entra (the app's own root URL) — import.meta.env
// BASE_URL is Vite's runtime reflection of the `base` config (see vite.config.js), so this stays
// correct automatically whether running on GitHub Pages or locally.
function redirectUri() {
  return window.location.origin + import.meta.env.BASE_URL
}

function base64url(bytes) {
  let str = ''
  bytes.forEach((b) => {
    str += String.fromCharCode(b)
  })
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(length) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return base64url(new Uint8Array(digest))
}

function loadTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? 'null')
  } catch {
    return null
  }
}

function saveTokens(tokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
  return tokens
}

export function isLoggedIn() {
  return Boolean(loadTokens()?.refresh_token)
}

export function logout() {
  localStorage.removeItem(TOKENS_KEY)
}

/** Redirects the whole page to Microsoft's login screen. Call from a click handler. */
export async function startLogin() {
  const verifier = randomString(64)
  const challenge = await sha256Base64Url(verifier)
  const state = randomString(16)
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }))

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    response_mode: 'query',
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })
  window.location.href = `${AUTHORITY}/authorize?${params.toString()}`
}

async function requestToken(body) {
  const res = await fetch(`${AUTHORITY}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.error_description?.split('\r\n')[0] || 'Microsoft rechazó la solicitud de token.')
  }
  return res.json()
}

function storeTokenResponse(data, fallbackRefreshToken) {
  return saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? fallbackRefreshToken,
    // 60s safety margin so a call started right before expiry doesn't get a token that dies mid-flight.
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  })
}

/**
 * If the current URL is a redirect back from Microsoft's login page (has a `code` in the query
 * string), completes the token exchange and strips the auth params from the URL. Safe to call
 * unconditionally on every app load — it's a no-op when there's no pending login. Returns true if a
 * login was just completed (so the caller can trigger an initial pull from OneDrive).
 */
export async function handleRedirectCallback() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code) return false

  const pendingRaw = sessionStorage.getItem(PKCE_KEY)
  sessionStorage.removeItem(PKCE_KEY)
  ;['code', 'state', 'session_state'].forEach((key) => url.searchParams.delete(key))
  window.history.replaceState({}, '', url.toString())

  const pending = pendingRaw ? JSON.parse(pendingRaw) : null
  if (!pending || pending.state !== state) return false

  const data = await requestToken(
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: pending.verifier,
      scope: SCOPES,
    }),
  )
  storeTokenResponse(data)
  return true
}

/** Returns a valid access token, silently refreshing it first if it's expired or about to expire. */
export async function getAccessToken() {
  const tokens = loadTokens()
  if (!tokens) throw new Error('No has conectado tu cuenta de OneDrive.')
  if (Date.now() < tokens.expires_at) return tokens.access_token

  try {
    const data = await requestToken(
      new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        scope: SCOPES,
      }),
    )
    return storeTokenResponse(data, tokens.refresh_token).access_token
  } catch (err) {
    logout()
    throw new Error('Tu sesión de Microsoft expiró — conéctate de nuevo con OneDrive.')
  }
}
