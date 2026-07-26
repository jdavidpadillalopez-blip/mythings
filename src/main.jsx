import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// GitHub Pages' default cache headers plus the browser's own ~24h throttle on checking a service
// worker script for changes meant a deploy could sit undetected in an already-open tab for a long
// time — the site kept showing an old, already-fixed bug after pushes. Forcing an update check right
// after registering (and again every 60s while the tab is open), combined with skipWaiting/
// clientsClaim in vite.config.js, makes a new deploy take over automatically and reload once, with
// no manual "clear the service worker" step needed.
let reloaded = false
function reloadOnce() {
  if (reloaded) return
  reloaded = true
  window.location.reload()
}

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    registration.update()
    setInterval(() => registration.update(), 60 * 1000)
  },
  onNeedRefresh: reloadOnce,
})

// Belt-and-suspenders: workbox's skipWaiting+clientsClaim (vite.config.js) mean the new worker can
// take control without ever going through the "waiting" state onNeedRefresh is designed around, so
// this catches that path too — either way, the open tab reloads once to pick up the new bundle.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce)
}
