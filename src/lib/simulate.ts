import type {
  Candidate,
  SeatList,
  SeatSplit,
  SimulationResult,
  SimulatedSeat,
  VacantQuota,
} from '../types/candidate'

export type SimulateOpts = {
  /** Show sub judice in the list (they never consume seats). Default true. */
  includeSubJudice?: boolean
  includeGestanteFimFila?: boolean
}

/** Same proportions used in T1 (375/100/25 of 500). */
export function splitSeats(n: number): SeatSplit {
  if (n <= 0) return { ampla: 0, negro: 0, pcd: 0 }
  let pcd = Math.round(n * 0.05)
  let negro = Math.round(n * 0.2)
  let ampla = n - pcd - negro
  if (ampla < 0) {
    negro = Math.max(0, negro + ampla)
    ampla = 0
  }
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

/** Sub judice appear on paper but never consume list seats (even if also gestante). */
export function occupiesSeat(c: Candidate): boolean {
  if (c.condition === 'Sub judice') return false
  if (queueStatusOf(c) === 'sub_judice') return false
  return true
}

export function isSubJudice(c: Candidate): boolean {
  return c.condition === 'Sub judice' || queueStatusOf(c) === 'sub_judice'
}

function visibleInSim(c: Candidate, opts: Required<SimulateOpts>): boolean {
  if (isSubJudice(c)) return opts.includeSubJudice
  if (queueStatusOf(c) === 'gestante_fim_fila') return opts.includeGestanteFimFila
  return true
}

function countOwnList(holders: SimulatedSeat[], list: SeatList): number {
  return holders.filter((x) => x.list === list && !x.fromVacantQuota).length
}

/** PPP in the UI = cota racial (negro). */
export function vacantQuotaShort(q: VacantQuota): string {
  return q === 'Negro' ? 'PPP' : 'PcD'
}

export function amplaPorFaltaPhrase(q: VacantQuota): string {
  return `ampla por falta de ${vacantQuotaShort(q)}`
}

export function isCotistaNaAmplaPorNota(s: SimulatedSeat): boolean {
  if (s.list !== 'Ampla' || s.fromVacantQuota) return false
  return isNegro(s.candidate) || isPcd(s.candidate)
}

/**
 * Replays the T1 pattern, then leftover quota → demais candidatos:
 * 1) Ampla seats = next by rank_geral among who occupies seats
 *    (cotista with a high enough geral rank takes ampla and does not consume cota)
 * 2) Negro seats = next by rank_negro (5.2.6: next on that list first)
 * 3) PcD seats = next by rank_pcd
 * 4) If negro/PcD lists are exhausted and reserved seats remain, those seats go to
 *    the next unseated people by rank_geral (5.2.6.1 / 5.1.6.9). Not 5.2.6.2.
 * Sub judice never take seats; optional display rows keep them visible in order.
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

  const remaining = all.filter((c) => c.in_remaining_queue)
  const seatPool = remaining
    .filter(occupiesSeat)
    .filter((c) => visibleInSim(c, filterOpts))

  const taken = new Set<number>()
  const seatHolders: SimulatedSeat[] = []

  const amplaPool = [...seatPool].sort((a, b) => a.rank_geral - b.rank_geral)
  for (const c of amplaPool) {
    if (countOwnList(seatHolders, 'Ampla') >= seats.ampla) break
    taken.add(c.pedido)
    seatHolders.push({
      list: 'Ampla',
      candidate: c,
      seatIndex: seatHolders.length + 1,
      occupiesSeat: true,
    })
  }

  const negroPool = seatPool
    .filter((c) => isNegro(c) && !taken.has(c.pedido) && c.rank_negro != null)
    .sort((a, b) => (a.rank_negro ?? 99999) - (b.rank_negro ?? 99999))
  for (const c of negroPool) {
    if (countOwnList(seatHolders, 'Negro') >= seats.negro) break
    taken.add(c.pedido)
    seatHolders.push({
      list: 'Negro',
      candidate: c,
      seatIndex: seatHolders.length + 1,
      occupiesSeat: true,
    })
  }

  const pcdPool = seatPool
    .filter((c) => isPcd(c) && !taken.has(c.pedido) && c.rank_pcd != null)
    .sort((a, b) => (a.rank_pcd ?? 99999) - (b.rank_pcd ?? 99999))
  for (const c of pcdPool) {
    if (countOwnList(seatHolders, 'PcD') >= seats.pcd) break
    taken.add(c.pedido)
    seatHolders.push({
      list: 'PcD',
      candidate: c,
      seatIndex: seatHolders.length + 1,
      occupiesSeat: true,
    })
  }

  const leftoverNegro = seats.negro - countOwnList(seatHolders, 'Negro')
  const leftoverPcd = seats.pcd - countOwnList(seatHolders, 'PcD')
  if (leftoverNegro > 0 || leftoverPcd > 0) {
    const nextGeral = amplaPool.filter((c) => !taken.has(c.pedido))
    let gi = 0
    const giveLeftover = (quota: VacantQuota, count: number) => {
      for (let i = 0; i < count && gi < nextGeral.length; i++, gi++) {
        const c = nextGeral[gi]!
        taken.add(c.pedido)
        seatHolders.push({
          list: 'Ampla',
          fromVacantQuota: quota,
          candidate: c,
          seatIndex: seatHolders.length + 1,
          occupiesSeat: true,
        })
      }
    }
    giveLeftover('Negro', leftoverNegro)
    giveLeftover('PcD', leftoverPcd)
  }

  // Display: seat holders + optional sub judice who sit (by rank) inside the Ampla window
  let called: SimulatedSeat[] = [...seatHolders]
  if (includeSubJudice) {
    const amplaSeats = seatHolders.filter((s) => s.list === 'Ampla')
    const maxAmplaRank = amplaSeats.length
      ? Math.max(...amplaSeats.map((s) => s.candidate.rank_geral))
      : 0
    const sjVisible = remaining
      .filter((c) => isSubJudice(c))
      .filter((c) => c.rank_geral <= maxAmplaRank)
      .sort((a, b) => a.rank_geral - b.rank_geral)
      .map(
        (c): SimulatedSeat => ({
          list: 'Ampla',
          candidate: c,
          seatIndex: 0,
          occupiesSeat: false,
        }),
      )
    called = [...seatHolders, ...sjVisible].sort(
      (a, b) => a.candidate.rank_geral - b.candidate.rank_geral,
    )
  }

  const seatConsumers = called.filter((s) => s.occupiesSeat !== false)
  const remapped = {
    negro: seatHolders.filter((x) => x.fromVacantQuota === 'Negro').length,
    pcd: seatHolders.filter((x) => x.fromVacantQuota === 'PcD').length,
  }
  const filled: SeatSplit = {
    ampla: countOwnList(seatHolders, 'Ampla'),
    negro: countOwnList(seatHolders, 'Negro'),
    pcd: countOwnList(seatHolders, 'PcD'),
  }
  const vacancies = {
    ampla: seats.ampla - filled.ampla,
    negro: seats.negro - filled.negro - remapped.negro,
    pcd: seats.pcd - filled.pcd - remapped.pcd,
    total: 0,
  }
  vacancies.total = vacancies.ampla + vacancies.negro + vacancies.pcd

  const womenInCall = seatConsumers.filter((s) => s.candidate.sex === 'F').length
  const womenPctInCall = seatConsumers.length
    ? (100 * womenInCall) / seatConsumers.length
    : 0

  const t1Women = all.filter((c) => c.called_t1 && c.sex === 'F').length
  const t1Total = all.filter((c) => c.called_t1).length
  const compWomen = all.filter((c) => c.called_complementar && c.sex === 'F').length
  const compTotal = all.filter((c) => c.called_complementar).length
  const cumWomen = t1Women + compWomen + womenInCall
  const cumTotal = t1Total + compTotal + seatConsumers.length
  const cumulativeWomenPct = cumTotal ? (100 * cumWomen) / cumTotal : 0

  return {
    n,
    seats,
    filled,
    remapped,
    vacancies,
    called,
    womenInCall,
    womenPctInCall,
    cumulativeWomenPct,
    womenFloorOk: cumulativeWomenPct >= 15,
  }
}

/** Paper queue vs people who can actually occupy a T2 seat. */
export function remainingUniverse(all: Candidate[]) {
  const rem = all.filter((c) => c.in_remaining_queue)
  return {
    remainingPaper: rem.length,
    remainingOccupying: rem.filter(occupiesSeat).length,
  }
}

/**
 * Max T2 size for the simulator: 100% of the remaining universe this sim uses.
 * Occupying people when sub judice is off; paper queue (incl. sub judice) when on.
 * Gestante/fim de fila follow the same filter as simulateCall.
 */
export function simNCap(all: Candidate[], opts?: SimulateOpts): number {
  const includeSubJudice = opts?.includeSubJudice ?? true
  const includeGestanteFimFila = opts?.includeGestanteFimFila ?? true
  const filterOpts = { includeSubJudice, includeGestanteFimFila }
  const rem = all.filter((c) => c.in_remaining_queue)
  const visible = rem.filter((c) => visibleInSim(c, filterOpts))
  const cap = includeSubJudice
    ? visible.length
    : visible.filter(occupiesSeat).length
  return Math.max(1, cap)
}

export type VacanciesNeededResult = {
  n: number
  list: SeatList | null
  fromVacantQuota?: VacantQuota
  remainingPaper: number
  remainingOccupying: number
  /** True when n is larger than people who can occupy remaining seats. */
  overflow: boolean
  vacancies: SeatSplit & { total: number }
}

/**
 * Smallest T2 size where `pedido` occupies a seat (75/20/5, sub judice excluded).
 * Search is 1..maxN, capped at remaining occupying (not an arbitrary 2000).
 * Overflow vs remaining people is a display flag; it does not change n.
 */
export function vacanciesNeededFor(
  all: Candidate[],
  pedido: number,
  opts?: SimulateOpts & { maxN?: number },
): VacanciesNeededResult | null {
  const { remainingPaper, remainingOccupying } = remainingUniverse(all)
  const cap = simNCap(all, {
    includeSubJudice: false,
    includeGestanteFimFila: opts?.includeGestanteFimFila ?? true,
  })
  const maxN = Math.min(opts?.maxN ?? cap, cap)
  const target = all.find((c) => c.pedido === pedido)
  if (!target || !target.in_remaining_queue) return null
  const emptyVacancies = {
    ampla: 0,
    negro: 0,
    pcd: 0,
    total: 0,
  }
  // Sub judice do not get a seat projection
  if (!occupiesSeat(target)) {
    return {
      n: maxN,
      list: null,
      remainingPaper,
      remainingOccupying,
      overflow: maxN > remainingOccupying,
      vacancies: emptyVacancies,
    }
  }

  for (let n = 1; n <= maxN; n++) {
    const sim = simulateCall(all, n, { ...opts, includeSubJudice: false })
    const hit = sim.called.find(
      (s) => s.candidate.pedido === pedido && s.occupiesSeat !== false,
    )
    if (hit) {
      return {
        n,
        list: hit.list,
        fromVacantQuota: hit.fromVacantQuota,
        remainingPaper,
        remainingOccupying,
        overflow: n > remainingOccupying,
        vacancies: sim.vacancies,
      }
    }
  }
  return {
    n: maxN,
    list: null,
    remainingPaper,
    remainingOccupying,
    overflow: maxN > remainingOccupying,
    vacancies: emptyVacancies,
  }
}

/** Full remaining queue for display (includes sub judice). */
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

/** Queues that actually consume seats (sub judice excluded). */
export function seatQueues(all: Candidate[]) {
  const rem = all.filter((c) => c.in_remaining_queue && occupiesSeat(c))
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

/**
 * Effective place in line: always ignores sub judice ahead.
 * If the person is sub judice, returns nulls (they do not hold a seat slot).
 */
export function positionInRemaining(all: Candidate[], c: Candidate) {
  if (!occupiesSeat(c)) {
    return { amplaPos: null, negroPos: null, pcdPos: null, ignoresSubJudice: true as const }
  }
  const q = seatQueues(all)
  const amplaPos = q.ampla.findIndex((x) => x.pedido === c.pedido) + 1 || null
  const negroPos = isNegro(c)
    ? q.negro.findIndex((x) => x.pedido === c.pedido) + 1 || null
    : null
  const pcdPos = isPcd(c)
    ? q.pcd.findIndex((x) => x.pedido === c.pedido) + 1 || null
    : null
  return { amplaPos, negroPos, pcdPos, ignoresSubJudice: true as const }
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
