import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Candidate, Meta } from '../types/candidate'
import { buildSearcher } from '../lib/search'

type DataCtx = {
  loading: boolean
  error: string | null
  candidates: Candidate[]
  meta: Meta | null
  search: (q: string, limit?: number) => Candidate[]
}

const Ctx = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cRes, mRes] = await Promise.all([
          fetch('./data/candidates.json'),
          fetch('./data/meta.json'),
        ])
        if (!cRes.ok || !mRes.ok) throw new Error('Falha ao carregar dados')
        const cJson = (await cRes.json()) as Candidate[]
        const mJson = (await mRes.json()) as Meta
        if (!cancelled) {
          setCandidates(cJson)
          setMeta(mJson)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const search = useMemo(() => buildSearcher(candidates), [candidates])

  const value = useMemo(
    () => ({ loading, error, candidates, meta, search }),
    [loading, error, candidates, meta, search],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData fora do provider')
  return v
}
