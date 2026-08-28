import { describe, expect, it } from 'vitest'
import type { Candidate } from '../types/candidate'
import {
  positionInRemaining,
  simulateCall,
  splitSeats,
  vacanciesNeededFor,
} from './simulate'

function stub(partial: Partial<Candidate> & Pick<Candidate, 'pedido' | 'rank_geral' | 'name'>): Candidate {
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

describe('splitSeats', () => {
  it('keeps 75/20/5 for 500', () => {
    expect(splitSeats(500)).toEqual({ ampla: 375, negro: 100, pcd: 25 })
  })
})

describe('simulateCall', () => {
  it('never includes already_called candidates', () => {
    const all = [
      stub({
        pedido: 1,
        rank_geral: 1,
        name: 'Called',
        already_called: true,
        called_t1: true,
        in_remaining_queue: false,
      }),
      stub({ pedido: 2, rank_geral: 597, name: 'Beatriz-like', in_remaining_queue: true }),
      stub({
        pedido: 3,
        rank_geral: 600,
        name: 'Negro next',
        segment: 'Negro',
        rank_negro: 1,
        in_remaining_queue: true,
      }),
    ]
    const sim = simulateCall(all, 10)
    expect(sim.called.every((s) => s.candidate.in_remaining_queue)).toBe(true)
    expect(sim.called.some((s) => s.candidate.pedido === 1)).toBe(false)
    expect(sim.called[0]?.candidate.pedido).toBe(2)
  })

  it('sub judice never consume seats but can stay visible', () => {
    const all = [
      stub({
        pedido: 1,
        rank_geral: 392,
        name: 'SJ ahead',
        condition: 'Sub judice',
        queue_status: 'sub_judice',
        in_remaining_queue: true,
      }),
      stub({
        pedido: 2,
        rank_geral: 616,
        name: 'Regular',
        queue_status: 'regular',
        in_remaining_queue: true,
      }),
    ]
    const shown = simulateCall(all, 1, { includeSubJudice: true })
    expect(shown.called.filter((s) => s.occupiesSeat !== false)).toHaveLength(1)
    expect(shown.called.find((s) => s.occupiesSeat !== false)?.candidate.pedido).toBe(2)
    expect(shown.called.some((s) => s.candidate.pedido === 1 && s.occupiesSeat === false)).toBe(
      true,
    )

    const hidden = simulateCall(all, 1, { includeSubJudice: false })
    expect(hidden.called.some((s) => s.candidate.pedido === 1)).toBe(false)
    expect(hidden.called[0]?.candidate.pedido).toBe(2)
  })

  it('gestante who is also sub judice still does not occupy a seat', () => {
    const all = [
      stub({
        pedido: 1,
        rank_geral: 602,
        name: 'SJ+gestante',
        condition: 'Sub judice',
        queue_status: 'gestante_fim_fila',
        taf: 'Gestante',
      }),
      stub({ pedido: 2, rank_geral: 616, name: 'Regular', queue_status: 'regular' }),
    ]
    expect(positionInRemaining(all, all[1]!).amplaPos).toBe(1)
    const sim = simulateCall(all, 1, { includeSubJudice: true, includeGestanteFimFila: true })
    expect(sim.called.find((s) => s.occupiesSeat !== false)?.candidate.pedido).toBe(2)
  })

  it('can exclude gestante_fim_fila from seat pool', () => {
    const all = [
      stub({
        pedido: 10,
        rank_geral: 583,
        name: 'Dayara-like',
        condition: 'Regular',
        queue_status: 'gestante_fim_fila',
        taf: 'Gestante',
        in_remaining_queue: true,
      }),
      stub({
        pedido: 11,
        rank_geral: 616,
        name: 'Regular next',
        queue_status: 'regular',
        in_remaining_queue: true,
      }),
    ]
    const withGest = simulateCall(all, 1, { includeGestanteFimFila: true })
    expect(withGest.called.find((s) => s.occupiesSeat !== false)?.candidate.pedido).toBe(10)
    const withoutGest = simulateCall(all, 1, { includeGestanteFimFila: false })
    expect(withoutGest.called.find((s) => s.occupiesSeat !== false)?.candidate.pedido).toBe(11)
  })
})

describe('positionInRemaining', () => {
  it('ignores all sub judice ahead when counting place', () => {
    const all = [
      stub({
        pedido: 1,
        rank_geral: 392,
        name: 'SJ',
        condition: 'Sub judice',
        queue_status: 'sub_judice',
      }),
      stub({
        pedido: 3,
        rank_geral: 602,
        name: 'SJ gestante',
        condition: 'Sub judice',
        queue_status: 'gestante_fim_fila',
        taf: 'Gestante',
      }),
      stub({ pedido: 2, rank_geral: 616, name: 'You', queue_status: 'regular' }),
    ]
    expect(positionInRemaining(all, all[2]!).amplaPos).toBe(1)
  })
})

describe('simulateCall vacancies', () => {
  it('leaves negro/PcD seats vacant when leftover quota pool is too small', () => {
    const all = [
      ...Array.from({ length: 15 }, (_, i) =>
        stub({ pedido: i + 1, rank_geral: i + 1, name: `Ampla ${i + 1}` }),
      ),
      stub({
        pedido: 16,
        rank_geral: 16,
        name: 'Negro leftover 1',
        segment: 'Negro',
        rank_negro: 1,
      }),
      stub({
        pedido: 17,
        rank_geral: 17,
        name: 'Negro leftover 2',
        segment: 'Negro',
        rank_negro: 2,
      }),
    ]
    const sim = simulateCall(all, 20, { includeSubJudice: false })
    expect(sim.seats).toEqual({ ampla: 15, negro: 4, pcd: 1 })
    expect(sim.filled).toEqual({ ampla: 15, negro: 2, pcd: 0 })
    expect(sim.vacancies).toEqual({ ampla: 0, negro: 2, pcd: 1, total: 3 })
    expect(sim.called.filter((s) => s.occupiesSeat !== false)).toHaveLength(17)
    expect(sim.called.every((s) => s.candidate != null)).toBe(true)
  })

  it('counts leftover quota after ampla already took high-rank negro', () => {
    const all = [
      stub({
        pedido: 1,
        rank_geral: 1,
        name: 'Negro who goes ampla',
        segment: 'Negro',
        rank_negro: 1,
      }),
      stub({ pedido: 2, rank_geral: 2, name: 'Ampla 2' }),
      stub({
        pedido: 3,
        rank_geral: 3,
        name: 'Negro leftover',
        segment: 'Negro',
        rank_negro: 2,
      }),
    ]
    const sim = simulateCall(all, 4, { includeSubJudice: false })
    expect(sim.seats).toEqual({ ampla: 3, negro: 1, pcd: 0 })
    expect(sim.filled.ampla).toBe(3)
    const cotistaNaAmpla = sim.called.find((s) => s.list === 'Ampla' && s.candidate.pedido === 1)
    expect(cotistaNaAmpla).toBeTruthy()
    expect(cotistaNaAmpla?.fromVacantQuota).toBeUndefined()
    expect(sim.filled.negro).toBe(0)
    expect(sim.remapped.negro).toBe(0)
    expect(sim.vacancies.negro).toBe(1)
  })

  it('gives leftover negro seats to the next geral', () => {
    const all = [
      ...Array.from({ length: 15 }, (_, i) =>
        stub({ pedido: i + 1, rank_geral: i + 1, name: `Ampla ${i + 1}` }),
      ),
      stub({
        pedido: 16,
        rank_geral: 16,
        name: 'Negro who takes own list',
        segment: 'Negro',
        rank_negro: 1,
      }),
      stub({ pedido: 17, rank_geral: 17, name: 'Next geral A' }),
      stub({ pedido: 18, rank_geral: 18, name: 'Next geral B' }),
      stub({ pedido: 19, rank_geral: 19, name: 'Next geral C' }),
      stub({ pedido: 20, rank_geral: 20, name: 'Next geral D' }),
    ]
    const sim = simulateCall(all, 20, { includeSubJudice: false })
    expect(sim.seats).toEqual({ ampla: 15, negro: 4, pcd: 1 })
    expect(sim.filled).toEqual({ ampla: 15, negro: 1, pcd: 0 })
    expect(sim.remapped).toEqual({ negro: 3, pcd: 1 })
    expect(sim.vacancies.total).toBe(0)
    expect(sim.called.find((s) => s.candidate.pedido === 16)?.list).toBe('Negro')
    expect(sim.called.find((s) => s.candidate.pedido === 17)?.fromVacantQuota).toBe('Negro')
    expect(sim.called.find((s) => s.candidate.pedido === 19)?.fromVacantQuota).toBe('Negro')
    expect(sim.called.find((s) => s.candidate.pedido === 20)?.fromVacantQuota).toBe('PcD')
  })

  it('gives leftover PcD seats to the next geral', () => {
    const all = [
      ...Array.from({ length: 15 }, (_, i) =>
        stub({ pedido: i + 1, rank_geral: i + 1, name: `Ampla ${i + 1}` }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        stub({
          pedido: 16 + i,
          rank_geral: 16 + i,
          name: `Negro ${i + 1}`,
          segment: 'Negro',
          rank_negro: i + 1,
        }),
      ),
      stub({ pedido: 20, rank_geral: 20, name: 'Ampla after quotas' }),
    ]
    const sim = simulateCall(all, 20, { includeSubJudice: false })
    expect(sim.filled).toEqual({ ampla: 15, negro: 4, pcd: 0 })
    expect(sim.remapped).toEqual({ negro: 0, pcd: 1 })
    expect(sim.vacancies.total).toBe(0)
    const hit = sim.called.find((s) => s.candidate.pedido === 20)
    expect(hit?.list).toBe('Ampla')
    expect(hit?.fromVacantQuota).toBe('PcD')
  })

  it('does not skip remaining negro on the reserve list (5.2.6)', () => {
    const all = [
      ...Array.from({ length: 15 }, (_, i) =>
        stub({ pedido: i + 1, rank_geral: i + 1, name: `Ampla ${i + 1}` }),
      ),
      stub({
        pedido: 16,
        rank_geral: 16,
        name: 'Negro still on list',
        segment: 'Negro',
        rank_negro: 1,
      }),
      stub({
        pedido: 17,
        rank_geral: 17,
        name: 'Negro next on list',
        segment: 'Negro',
        rank_negro: 2,
      }),
      stub({
        pedido: 18,
        rank_geral: 18,
        name: 'Negro third on list',
        segment: 'Negro',
        rank_negro: 3,
      }),
      stub({ pedido: 19, rank_geral: 19, name: 'Would-be skip A' }),
      stub({ pedido: 20, rank_geral: 20, name: 'Would-be skip B' }),
    ]
    const sim = simulateCall(all, 20, { includeSubJudice: false })
    expect(sim.called.find((s) => s.candidate.pedido === 16)?.list).toBe('Negro')
    expect(sim.called.find((s) => s.candidate.pedido === 17)?.list).toBe('Negro')
    expect(sim.called.find((s) => s.candidate.pedido === 18)?.list).toBe('Negro')
    expect(sim.called.find((s) => s.candidate.pedido === 16)?.fromVacantQuota).toBeUndefined()
    expect(sim.filled.negro).toBe(3)
    expect(sim.remapped).toEqual({ negro: 1, pcd: 1 })
    expect(sim.called.find((s) => s.candidate.pedido === 19)?.fromVacantQuota).toBe('Negro')
    expect(sim.called.find((s) => s.candidate.pedido === 20)?.fromVacantQuota).toBe('PcD')
  })

  it('leaves seats vacant only when nobody is left in the remaining universe', () => {
    const all = [
      ...Array.from({ length: 15 }, (_, i) =>
        stub({ pedido: i + 1, rank_geral: i + 1, name: `Ampla ${i + 1}` }),
      ),
      stub({
        pedido: 16,
        rank_geral: 16,
        name: 'Would-be extra ampla',
      }),
    ]
    const sim = simulateCall(all, 20, { includeSubJudice: false })
    expect(sim.seats).toEqual({ ampla: 15, negro: 4, pcd: 1 })
    expect(sim.filled.ampla).toBe(15)
    expect(sim.remapped).toEqual({ negro: 1, pcd: 0 })
    expect(sim.called.some((s) => s.candidate.pedido === 16 && s.fromVacantQuota === 'Negro')).toBe(
      true,
    )
    expect(sim.vacancies).toEqual({ ampla: 0, negro: 3, pcd: 1, total: 4 })
    expect(sim.called.filter((s) => s.occupiesSeat !== false)).toHaveLength(16)
  })
})

describe('vacanciesNeededFor', () => {
  it('returns the same small n when the candidate enters within remaining people', () => {
    const all = Array.from({ length: 10 }, (_, i) =>
      stub({ pedido: i + 1, rank_geral: i + 1, name: `C${i + 1}` }),
    )
    const need = vacanciesNeededFor(all, 1)
    expect(need).toMatchObject({
      n: 1,
      list: 'Ampla',
      overflow: false,
      remainingOccupying: 10,
    })
  })

  it('lets the 60th geral enter when leftover quota covers them, not at 80 percentage ampla', () => {
    const all = Array.from({ length: 200 }, (_, i) =>
      stub({ pedido: i + 1, rank_geral: i + 1, name: `C${i + 1}` }),
    )
    const need = vacanciesNeededFor(all, 60)
    expect(need?.n).toBe(60)
    expect(need?.list).toBe('Ampla')
    expect(need?.fromVacantQuota).toBe('PcD')
    expect(need?.overflow).toBe(false)
    expect(need?.vacancies.total).toBe(0)
  })

  it('lets the last remaining ampla enter via leftover quota without overflow when people exist', () => {
    const occupying = [
      ...Array.from({ length: 16 }, (_, i) =>
        stub({ pedido: i + 1, rank_geral: i + 1, name: `Ampla ${i + 1}` }),
      ),
      stub({
        pedido: 17,
        rank_geral: 17,
        name: 'Negro leftover',
        segment: 'Negro',
        rank_negro: 1,
      }),
    ]
    const need = vacanciesNeededFor(occupying, 16, { maxN: 80 })
    expect(need?.n).toBe(17)
    expect(need?.list).toBe('Ampla')
    expect(need?.fromVacantQuota).toBe('PcD')
    expect(need?.overflow).toBe(false)
    expect(need?.remainingOccupying).toBe(17)
    expect(need?.vacancies.total).toBe(0)
  })

  it('lets the 1105th ampla person enter at n=1105 via leftover quota (Emanuel-shaped)', () => {
    const all = Array.from({ length: 1105 }, (_, i) =>
      stub({ pedido: i + 1, rank_geral: i + 1, name: `C${i + 1}` }),
    )
    const need = vacanciesNeededFor(all, 1105, { maxN: 1200 })
    expect(need?.n).toBe(1105)
    expect(need?.list).toBe('Ampla')
    expect(need?.fromVacantQuota).toBe('PcD')
    expect(need?.overflow).toBe(false)
    expect(need?.remainingOccupying).toBe(1105)
    expect(need?.vacancies.total).toBe(0)
  })
})
