const RELOAD_KEY = 'mesmo-barco:reloaded-for'

/**
 * GitHub Pages caches HTML/JS (~max-age=600) and browsers may keep a stale
 * index.html that points at an older bundle. Compare the baked-in build id to
 * a no-store version.json; reload once per deploy if they diverge.
 */
export async function ensureFreshDeploy(): Promise<boolean> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return true
    const remote = (await res.json()) as { buildId?: string }
    const remoteId = remote.buildId
    if (!remoteId || remoteId === __APP_BUILD_ID__) {
      sessionStorage.removeItem(RELOAD_KEY)
      return true
    }
    if (sessionStorage.getItem(RELOAD_KEY) === remoteId) {
      // Already reloaded for this remote id (CDN may still be catching up).
      return true
    }
    sessionStorage.setItem(RELOAD_KEY, remoteId)
    location.reload()
    return false
  } catch {
    return true
  }
}
