import { describe, expect, it } from 'vitest'
import type { Candidate } from '../types/candidate'
import {
  matchesSegmentFilters,
  remainingQueuePeople,
} from './queueList'

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
    ...partial,
  }
}

describe('remainingQueuePeople', () => {
  const people = [
    stub({ pedido: 1, rank_geral: 10, name: 'Ampla A', segment: 'Ampla' }),
    stub({
      pedido: 2,
      rank_geral: 11,
      name: 'Negro B',
      segment: 'Negro',
      rank_negro: 3,
    }),
    stub({
      pedido: 3,
      rank_geral: 12,
      name: 'PcD C',
      segment: 'PcD',
      rank_pcd: 2,
    }),
    stub({
      pedido: 4,
      rank_geral: 13,
      name: 'Dual D',
      segment: 'Negro e PcD',
      rank_negro: 4,
      rank_pcd: 1,
    }),
    stub({
      pedido: 5,
      rank_geral: 14,
      name: 'Sub judice E',
      segment: 'Ampla',
      queue_status: 'sub_judice',
      condition: 'Sub judice',
    }),
    stub({
      pedido: 6,
      rank_geral: 15,
      name: 'Gestante F',
      segment: 'Ampla',
      queue_status: 'gestante_fim_fila',
    }),
    stub({
      pedido: 99,
      rank_geral: 1,
      name: 'Já chamada',
      in_remaining_queue: false,
    }),
  ]

  it('drops people already called', () => {
    const got = remainingQueuePeople(people, {
      segments: [],
      includeSubJudice: true,
    })
    expect(got.map((c) => c.pedido)).not.toContain(99)
  })

  it('treats empty segment filter as show all remaining', () => {
    const got = remainingQueuePeople(people, {
      segments: [],
      includeSubJudice: true,
    })
    expect(got.map((c) => c.pedido)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('lets Negro e PcD through if Negro or PcD is checked', () => {
    expect(matchesSegmentFilters(people[3], ['Negro'])).toBe(true)
    expect(matchesSegmentFilters(people[3], ['PcD'])).toBe(true)
    expect(matchesSegmentFilters(people[3], ['Ampla'])).toBe(false)
    const negro = remainingQueuePeople(people, {
      segments: ['Negro'],
      includeSubJudice: true,
    })
    expect(negro.map((c) => c.name)).toEqual(['Negro B', 'Dual D'])
  })

  it('keeps gestante even when sub judice is off', () => {
    const got = remainingQueuePeople(people, {
      segments: ['Ampla'],
      includeSubJudice: false,
    })
    expect(got.map((c) => c.name)).toEqual(['Ampla A', 'Gestante F'])
  })

  it('sorts by list rank when a single quota is selected', () => {
    const pcd = remainingQueuePeople(people, {
      segments: ['PcD'],
      includeSubJudice: true,
    })
    expect(pcd.map((c) => c.name)).toEqual(['Dual D', 'PcD C'])
  })
})
