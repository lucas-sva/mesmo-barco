import type { Candidate } from '../types/candidate'
import { isNegro, isPcd, isSubJudice } from './simulate'

export type SegmentFilter = 'Ampla' | 'Negro' | 'PcD'

export function isAmpla(c: Candidate): boolean {
  return !isNegro(c) && !isPcd(c)
}

/** Negro e PcD matches if Negro OR PcD is selected. None selected = everyone. */
export function matchesSegmentFilters(
  c: Candidate,
  selected: readonly SegmentFilter[],
): boolean {
  if (selected.length === 0) return true
  return selected.some((s) => {
    if (s === 'Ampla') return isAmpla(c)
    if (s === 'Negro') return isNegro(c)
    if (s === 'PcD') return isPcd(c)
    return false
  })
}

function sortKey(c: Candidate, selected: readonly SegmentFilter[]): number {
  const onlyNegro = selected.length === 1 && selected[0] === 'Negro'
  const onlyPcd = selected.length === 1 && selected[0] === 'PcD'
  if (onlyNegro && c.rank_negro != null) return c.rank_negro
  if (onlyPcd && c.rank_pcd != null) return c.rank_pcd
  return c.rank_geral
}

export type RemainingQueueOpts = {
  segments: readonly SegmentFilter[]
  includeSubJudice: boolean
}

/** Remaining T2 queue only. Gestante/fim de fila always stay. Not a T2 projection. */
export function remainingQueuePeople(
  all: Candidate[],
  opts: RemainingQueueOpts,
): Candidate[] {
  return all
    .filter((c) => c.in_remaining_queue)
    .filter((c) => matchesSegmentFilters(c, opts.segments))
    .filter((c) => opts.includeSubJudice || !isSubJudice(c))
    .sort((a, b) => sortKey(a, opts.segments) - sortKey(b, opts.segments))
}
