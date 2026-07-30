import type { Candidate, SeatList, SimulationResult, SimulatedSeat } from '../types/candidate'

export type SimulateOpts = {
  includeSubJudice?: boolean
  includeGestanteFimFila?: boolean
}

/** Same proportions used in T1 (375/100/25 of 500). */
export function splitSeats(n: number): { ampla: number; negro: number; pcd: number } {
  if (n <= 0) return { ampla: 0, negro: 0, pcd: 0 }
  let pcd = Math.round(n * 0.05)
  let negro = Math.round(n * 0.2)
  let ampla = n - pcd - negro
  if (ampla < 0) {
    negro = Math.max(0, negro + ampla)
    ampla = 0
  }
  // keep sum exact
  const sum = ampla + negro + pcd
  if (sum !== n) ampla += n - sum
  return { ampla, negro, pcd }
}

function isNegro(c: Candidate): boolean {
  return c.segment === 'Negro' || c.segment === 'Negro e PcD'
}

function isPcd(c: Candidate): boolean {
  return c.segment === 'PcD' || c.segment === 'Negro e PcD'
}

export function queueStatusOf(c: Candidate): string {
  if (c.queue_status) return c.queue_status
  if ((c.taf || '').toLowerCase() === 'gestante' || c.gestante_condicional) {
    return 'gestante_fim_fila'
  }
  if (c.condition === 'Sub judice') return 'sub_judice'
  if ((c.taf || '').toLowerCase() === 'inapto') return 'inapto'
  return 'regular'
}

function eligibleForSim(c: Candidate, opts: SimulateOpts): boolean {
  const status = queueStatusOf(c)
  if (!opts.includeSubJudice && status === 'sub_judice') return false
  if (!opts.includeGestanteFimFila && status === 'gestante_fim_fila') return false
  return true
}

/**
 * Replays the T1 pattern observed in Edital 17:
 * 1) Ampla seats = next N by rank_geral (any segment)
 * 2) Negro seats = next by rank_negro among remaining negros
 * 3) PcD seats = next by rank_pcd among remaining PcD
 */
export function simulateCall(
  all: Candidate[],
  n: number,
  opts?: SimulateOpts,
): SimulationResult {
  const includeSubJudice = opts?.includeSubJudice ?? true
  const includeGestanteFimFila = opts?.includeGestanteFimFila ?? true
  const filterOpts = { includeSubJudice, includeGestanteFimFila }
  const seats = splitSeats(n)
  const pool = all
    .filter((c) => c.in_remaining_queue)
    .filter((c) => eligibleForSim(c, filterOpts))

  const taken = new Set<number>()
  const called: SimulatedSeat[] = []

  const amplaPool = [...pool].sort((a, b) => a.rank_geral - b.rank_geral)
  for (const c of amplaPool) {
    if (called.filter((x) => x.list === 'Ampla').length >= seats.ampla) break
    taken.add(c.pedido)
    called.push({ list: 'Ampla', candidate: c, seatIndex: called.length + 1 })
  }

  const negroPool = pool
    .filter((c) => isNegro(c) && !taken.has(c.pedido) && c.rank_negro != null)
    .sort((a, b) => (a.rank_negro ?? 99999) - (b.rank_negro ?? 99999))
  for (const c of negroPool) {
    if (called.filter((x) => x.list === 'Negro').length >= seats.negro) break
    taken.add(c.pedido)
    called.push({ list: 'Negro', candidate: c, seatIndex: called.length + 1 })
  }

  const pcdPool = pool
    .filter((c) => isPcd(c) && !taken.has(c.pedido) && c.rank_pcd != null)
    .sort((a, b) => (a.rank_pcd ?? 99999) - (b.rank_pcd ?? 99999))
  for (const c of pcdPool) {
    if (called.filter((x) => x.list === 'PcD').length >= seats.pcd) break
    taken.add(c.pedido)
    called.push({ list: 'PcD', candidate: c, seatIndex: called.length + 1 })
  }

  const womenInCall = called.filter((s) => s.candidate.sex === 'F').length
  const womenPctInCall = called.length ? (100 * womenInCall) / called.length : 0

  const t1Women = all.filter((c) => c.called_t1 && c.sex === 'F').length
  const t1Total = all.filter((c) => c.called_t1).length
  const compWomen = all.filter((c) => c.called_complementar && c.sex === 'F').length
  const compTotal = all.filter((c) => c.called_complementar).length
  const cumWomen = t1Women + compWomen + womenInCall
  const cumTotal = t1Total + compTotal + called.length
  const cumulativeWomenPct = cumTotal ? (100 * cumWomen) / cumTotal : 0

  return {
    n,
    seats,
    called,
    womenInCall,
    womenPctInCall,
    cumulativeWomenPct,
    womenFloorOk: cumulativeWomenPct >= 15,
  }
}

export function vacanciesNeededFor(
  all: Candidate[],
  pedido: number,
  opts?: SimulateOpts & { maxN?: number },
): { n: number; list: SeatList | null } | null {
  const maxN = opts?.maxN ?? 2000
  const target = all.find((c) => c.pedido === pedido)
  if (!target || !target.in_remaining_queue) return null

  for (let n = 1; n <= maxN; n++) {
    const sim = simulateCall(all, n, opts)
    const hit = sim.called.find((s) => s.candidate.pedido === pedido)
    if (hit) return { n, list: hit.list }
  }
  return { n: maxN, list: null }
}

export function remainingQueues(all: Candidate[]) {
  const rem = all.filter((c) => c.in_remaining_queue)
  return {
    ampla: [...rem].sort((a, b) => a.rank_geral - b.rank_geral),
    negro: rem
      .filter((c) => isNegro(c) && c.rank_negro != null)
      .sort((a, b) => (a.rank_negro ?? 0) - (b.rank_negro ?? 0)),
    pcd: rem
      .filter((c) => isPcd(c) && c.rank_pcd != null)
      .sort((a, b) => (a.rank_pcd ?? 0) - (b.rank_pcd ?? 0)),
  }
}

export function positionInRemaining(all: Candidate[], c: Candidate) {
  const q = remainingQueues(all)
  const amplaPos = q.ampla.findIndex((x) => x.pedido === c.pedido) + 1 || null
  const negroPos = isNegro(c)
    ? q.negro.findIndex((x) => x.pedido === c.pedido) + 1 || null
    : null
  const pcdPos = isPcd(c)
    ? q.pcd.findIndex((x) => x.pedido === c.pedido) + 1 || null
    : null
  return { amplaPos, negroPos, pcdPos }
}

export function queueStatusLabel(status: string): string {
  switch (status) {
    case 'sub_judice':
      return 'Sub judice'
    case 'gestante_fim_fila':
      return 'Gestante / fim de fila'
    case 'inapto':
      return 'Inapto'
    default:
      return 'Regular'
  }
}
