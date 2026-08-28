import type { Candidate } from '../types/candidate'
import {
  isNegro,
  isPcd,
  isSubJudice,
  seatQueues,
  simulateCall,
  vacanciesNeededFor,
} from './simulate'

function foldName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Adult public-contest candidate targeted by the Listas “Não marque” prank. */
export function isNinjaCandidate(c: Candidate): boolean {
  const n = foldName(c.name_norm || c.name)
  return (
    n.includes('jose ricardo da silva lins filho') ||
    (n.includes('jose ricardo') && n.includes('lins filho'))
  )
}

export function findNinja(all: Candidate[]): Candidate | undefined {
  return all.find(isNinjaCandidate)
}

export type NaoMarqueOpts = {
  includeSubJudice: boolean
}

function uniqueByPedido(xs: Candidate[]): Candidate[] {
  const seen = new Set<number>()
  const out: Candidate[] = []
  for (const c of xs) {
    if (seen.has(c.pedido)) continue
    seen.add(c.pedido)
    out.push(c)
  }
  return out
}

/**
 * Occupying Negro-list people who sit in the T2 where Ricardo first enters
 * (the Simular Negro card at that n — not the 75/20/5 seat number if they differ,
 * and not every remaining negro if they would not sit yet).
 * If he has no cutoff, fall back to the full remaining occupying Negro queue.
 */
export function negrosWhoSitAtNinjaCutoff(all: Candidate[]): Candidate[] {
  const ninja = findNinja(all)
  if (!ninja?.in_remaining_queue) return seatQueues(all).negro

  const need = vacanciesNeededFor(all, ninja.pedido, {
    includeGestanteFimFila: true,
  })
  if (!need || need.list == null) return seatQueues(all).negro

  const sim = simulateCall(all, need.n, {
    includeSubJudice: false,
    includeGestanteFimFila: true,
  })
  return sim.called
    .filter((s) => s.list === 'Negro' && s.occupiesSeat !== false)
    .map((s) => s.candidate)
}

/**
 * Negro-list sitters at Ricardo’s T2 cutoff + every remaining PcD (incl. Negro e PcD,
 * gestante). Then Ricardo last. Ignores the segment radios. Sub judice only affect PcDs
 * on paper (the Negro sitters already occupy seats).
 */
export function naoMarqueQueue(
  all: Candidate[],
  opts: NaoMarqueOpts,
): Candidate[] {
  const ninja = findNinja(all)
  const ninjaPedido = ninja?.pedido

  const negros = negrosWhoSitAtNinjaCutoff(all)
  const pcds = all
    .filter((c) => c.in_remaining_queue)
    .filter(isPcd)
    .filter((c) => opts.includeSubJudice || !isSubJudice(c))

  const ahead = uniqueByPedido([...negros, ...pcds])
    .filter((c) => ninjaPedido == null || c.pedido !== ninjaPedido)
    .sort((a, b) => a.rank_geral - b.rank_geral)

  if (!ninja) return ahead
  return [...ahead, ninja]
}

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
