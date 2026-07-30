import Fuse from 'fuse.js'
import type { Candidate } from '../types/candidate'

function strip(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildSearcher(candidates: Candidate[]) {
  const enriched = candidates.map((c) => ({
    ...c,
    _q: strip(c.name),
    _pedido: String(c.pedido),
  }))

  const fuse = new Fuse(enriched, {
    keys: [
      { name: '_q', weight: 0.7 },
      { name: 'name', weight: 0.2 },
      { name: '_pedido', weight: 0.1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })

  return (query: string, limit = 20): Candidate[] => {
    const q = strip(query)
    if (!q) return []

    // exact pedido
    if (/^\d+$/.test(q)) {
      const hit = candidates.find((c) => String(c.pedido) === q)
      if (hit) return [hit]
    }

    const results = fuse.search(q, { limit })
    return results.map((r) => {
      const { _q: _, _pedido: __, ...rest } = r.item as Candidate & {
        _q: string
        _pedido: string
      }
      return rest
    })
  }
}
