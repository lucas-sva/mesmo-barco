import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Candidate } from '../types/candidate'
import {
  findNinja,
  isNinjaCandidate,
  naoMarqueQueue,
  negrosWhoSitAtNinjaCutoff,
  remainingQueuePeople,
} from './queueList'
import {
  isNegro,
  isPcd,
  occupiesSeat,
  simulateCall,
  splitSeats,
  vacanciesNeededFor,
} from './simulate'

function stub(
  partial: Partial<Candidate> & Pick<Candidate, 'pedido' | 'rank_geral' | 'name'>,
): Candidate {
  return {
    name_norm: '',
    condition: 'Regular',
    segment: 'Ampla',
    birth_date: null,
    scores: {
      lp: null,
      inf: null,
      rl: null,
      dc: null,
      da: null,
      dp: null,
      pp: null,
      lep: null,
      le: null,
      cont: null,
      cri: null,
      ml: null,
      est: null,
      objetiva: null,
      discursiva: null,
      total: 100,
    },
    taf: 'Apto',
    psychological: null,
    social_investigation: null,
    sex: 'M',
    rank_pcd: null,
    rank_negro: null,
    situation: 'cadastro_reserva',
    classified_as: null,
    called_t1: false,
    called_complementar: false,
    already_called: false,
    in_remaining_queue: true,
    queue_status: 'regular',
    ...partial,
  }
}

const ninja = stub({
  pedido: 289,
  name: 'Jose Ricardo da Silva Lins Filho',
  name_norm: 'jose ricardo da silva lins filho',
  rank_geral: 1399,
  segment: 'Ampla',
})

describe('isNinjaCandidate', () => {
  it('matches José/Jose + Lins Filho', () => {
    expect(
      isNinjaCandidate(
        stub({
          pedido: 1,
          name: 'José Ricardo da Silva Lins Filho',
          name_norm: 'jose ricardo da silva lins filho',
          rank_geral: 1,
        }),
      ),
    ).toBe(true)
    expect(isNinjaCandidate(ninja)).toBe(true)
  })

  it('does not match another José Ricardo', () => {
    expect(
      isNinjaCandidate(
        stub({
          pedido: 2,
          name: 'Jose Ricardo Ferreira e Silva',
          name_norm: 'jose ricardo ferreira e silva',
          rank_geral: 2,
        }),
      ),
    ).toBe(false)
  })
})

describe('naoMarqueQueue stubs', () => {
  const pcdAhead = stub({
    pedido: 11,
    name: 'Beto PcD',
    rank_geral: 200,
    rank_pcd: 1,
    segment: 'PcD',
  })
  const pcdBehind = stub({
    pedido: 18,
    name: 'Íris PcD atrás na geral',
    rank_geral: 5000,
    rank_pcd: 2,
    segment: 'PcD',
  })
  const both = stub({
    pedido: 12,
    name: 'Carla Negro e PcD',
    rank_geral: 300,
    rank_negro: 2,
    rank_pcd: 3,
    segment: 'Negro e PcD',
  })
  const sjPcd = stub({
    pedido: 14,
    name: 'Eva Sub judice',
    rank_geral: 500,
    rank_pcd: 4,
    segment: 'PcD',
    condition: 'Sub judice',
    queue_status: 'sub_judice',
  })
  const amplaAhead = stub({
    pedido: 16,
    name: 'Guga Ampla',
    rank_geral: 50,
    segment: 'Ampla',
  })
  const calledPcd = stub({
    pedido: 17,
    name: 'Helena Chamada',
    rank_geral: 20,
    rank_pcd: 1,
    segment: 'PcD',
    already_called: true,
    in_remaining_queue: false,
    called_t1: true,
  })

  const pool = [amplaAhead, calledPcd, pcdAhead, both, sjPcd, pcdBehind, ninja]

  it('includes every remaining PcD and puts him last, never mistura ampla', () => {
    const list = naoMarqueQueue(pool, { includeSubJudice: true })
    expect(list.at(-1)?.pedido).toBe(289)
    expect(list.some((c) => c.pedido === 16)).toBe(false)
    expect(list.some((c) => c.pedido === 17)).toBe(false)
    expect(list.map((c) => c.pedido)).toEqual(
      expect.arrayContaining([11, 12, 14, 18, 289]),
    )
    const normalAmpla = remainingQueuePeople(pool, {
      segments: ['Ampla'],
      includeSubJudice: true,
    })
    expect(normalAmpla.some((c) => c.pedido === 16)).toBe(true)
  })

  it('hides sub judice PcDs when asked and keeps remaining occupying PcDs', () => {
    const list = naoMarqueQueue(pool, { includeSubJudice: false })
    expect(list.some((c) => c.pedido === 14)).toBe(false)
    expect(list.some((c) => c.pedido === 11)).toBe(true)
    expect(list.some((c) => c.pedido === 18)).toBe(true)
    expect(list.at(-1)?.pedido).toBe(289)
  })

  it('still puts him last if he is not remaining', () => {
    const gone = { ...ninja, in_remaining_queue: false, already_called: true }
    const list = naoMarqueQueue(
      pool.map((c) => (c.pedido === 289 ? gone : c)),
      { includeSubJudice: true },
    )
    expect(list.at(-1)?.pedido).toBe(289)
  })
})

describe('naoMarqueQueue with official data', () => {
  const all = JSON.parse(
    readFileSync(resolve('public/data/candidates.json'), 'utf8'),
  ) as Candidate[]

  it('is Negro sitters at his T2 cutoff + all remaining PcDs + Ricardo last', () => {
    const him = findNinja(all)
    expect(him?.pedido).toBe(289)
    expect(him?.rank_geral).toBe(1399)
    expect(him?.in_remaining_queue).toBe(true)

    const need = vacanciesNeededFor(all, him!.pedido, {
      includeGestanteFimFila: true,
    })
    expect(need?.n).toBeTruthy()
    expect(need?.fromVacantQuota).toBe('PcD')

    const sim = simulateCall(all, need!.n, {
      includeSubJudice: false,
      includeGestanteFimFila: true,
    })
    const negroSitters = sim.called
      .filter((s) => s.list === 'Negro' && s.occupiesSeat !== false)
      .map((s) => s.candidate)
    const negroCard = splitSeats(need!.n).negro
    // User recalled 163: that is both the Negro card and the occupying sitters at this cutoff.
    expect(negroSitters.length).toBe(sim.filled.negro)
    expect(negroSitters.length).toBe(negroCard)
    expect(negrosWhoSitAtNinjaCutoff(all).map((c) => c.pedido)).toEqual(
      negroSitters.map((c) => c.pedido),
    )

    const remPcdPaper = all.filter((c) => c.in_remaining_queue && isPcd(c))
    const remPcdOcc = remPcdPaper.filter(occupiesSeat)
    expect(remPcdOcc.length).toBe(sim.filled.pcd)

    const occupyingNegroRemaining = all.filter(
      (c) => c.in_remaining_queue && occupiesSeat(c) && isNegro(c) && !isPcd(c),
    )
    // More negros wait on that list; they are not ahead of him at this cutoff.
    expect(occupyingNegroRemaining.length).toBeGreaterThan(negroSitters.length)

    const withSj = naoMarqueQueue(all, { includeSubJudice: true })
    expect(withSj.at(-1)?.pedido).toBe(289)
    const aheadSj = withSj.slice(0, -1)
    expect(new Set(aheadSj.map((c) => c.pedido))).toEqual(
      new Set([...negroSitters, ...remPcdPaper].map((c) => c.pedido)),
    )
    expect(aheadSj.filter((c) => c.segment === 'Negro').length).toBe(
      negroSitters.length,
    )
    expect(aheadSj.filter(isPcd).length).toBe(remPcdPaper.length)
    expect(aheadSj.every((c) => isNegro(c) || isPcd(c))).toBe(true)

    const noSj = naoMarqueQueue(all, { includeSubJudice: false })
    expect(noSj.at(-1)?.pedido).toBe(289)
    const aheadNo = noSj.slice(0, -1)
    expect(new Set(aheadNo.map((c) => c.pedido))).toEqual(
      new Set([...negroSitters, ...remPcdOcc].map((c) => c.pedido)),
    )
  })
})
