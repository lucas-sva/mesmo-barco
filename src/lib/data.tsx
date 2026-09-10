import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Candidate, CandidateListItem, Meta } from '../types/candidate'
import { buildSearcher } from '../lib/search'

type DataCtx = {
  loading: boolean
  error: string | null
  /** Slim index for Home/Listas/Simular (candidates-list.json). */
  candidates: CandidateListItem[]
  meta: Meta | null
  search: (q: string, limit?: number) => CandidateListItem[]
  /** Full records; null until CandidatePage (or ensureFull) loads candidates.json. */
  fullCandidates: Candidate[] | null
  fullLoading: boolean
  fullError: string | null
  ensureFullCandidates: () => Promise<Candidate[]>
}

const Ctx = createContext<DataCtx | null>(null)

/** Stable per deploy so browsers can cache multi-MB JSON; busts on new build. */
const DATA_QS = `v=${encodeURIComponent(__APP_BUILD_ID__)}`

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fullCandidates, setFullCandidates] = useState<Candidate[] | null>(null)
  const [fullLoading, setFullLoading] = useState(false)
  const [fullError, setFullError] = useState<string | null>(null)
  const fullPromise = useRef<Promise<Candidate[]> | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Default HTTP cache (not no-store): mobile re-visits skip re-download.
        // Query uses __APP_BUILD_ID__ so a new deploy still busts the cache.
        const [cRes, mRes] = await Promise.all([
          fetch(`./data/candidates-list.json?${DATA_QS}`),
          fetch(`./data/meta.json?${DATA_QS}`),
        ])
        if (!cRes.ok || !mRes.ok) throw new Error('Falha ao carregar dados')
        const cJson = (await cRes.json()) as CandidateListItem[]
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

  const ensureFullCandidates = useCallback(async () => {
    if (fullCandidates) return fullCandidates
    if (fullPromise.current) return fullPromise.current

    setFullLoading(true)
    setFullError(null)
    const p = (async () => {
      try {
        const res = await fetch(`./data/candidates.json?${DATA_QS}`)
        if (!res.ok) throw new Error('Falha ao carregar ficha completa')
        const json = (await res.json()) as Candidate[]
        setFullCandidates(json)
        return json
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro'
        setFullError(msg)
        throw e instanceof Error ? e : new Error(msg)
      } finally {
        setFullLoading(false)
        fullPromise.current = null
      }
    })()
    fullPromise.current = p
    return p
  }, [fullCandidates])

  const search = useMemo(() => buildSearcher(candidates), [candidates])

  const value = useMemo(
    () => ({
      loading,
      error,
      candidates,
      meta,
      search,
      fullCandidates,
      fullLoading,
      fullError,
      ensureFullCandidates,
    }),
    [
      loading,
      error,
      candidates,
      meta,
      search,
      fullCandidates,
      fullLoading,
      fullError,
      ensureFullCandidates,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData fora do provider')
  return v
}
