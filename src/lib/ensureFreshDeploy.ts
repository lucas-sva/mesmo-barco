const RELOAD_KEY = 'mesmo-barco:reloaded-for'

/**
 * GitHub Pages caches HTML/JS (~max-age=600) and browsers may keep a stale
 * index.html that points at an older bundle. Compare the baked-in build id to
 * a no-store version.json; reload once per deploy if they diverge.
 * Callers should not block first paint — run this in parallel with boot.
 */
export async function ensureFreshDeploy(): Promise<void> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const remote = (await res.json()) as { buildId?: string }
    const remoteId = remote.buildId
    if (!remoteId || remoteId === __APP_BUILD_ID__) {
      sessionStorage.removeItem(RELOAD_KEY)
      return
    }
    if (sessionStorage.getItem(RELOAD_KEY) === remoteId) {
      // Already reloaded for this remote id (CDN may still be catching up).
      return
    }
    sessionStorage.setItem(RELOAD_KEY, remoteId)
    location.reload()
  } catch {
    // Ignore — app already started.
  }
}
