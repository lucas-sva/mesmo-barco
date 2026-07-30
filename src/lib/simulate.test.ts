import { describe, expect, it } from 'vitest'
import type { Candidate } from '../types/candidate'
import { simulateCall, splitSeats } from './simulate'

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

  it('can exclude gestante_fim_fila like sub judice', () => {
    const all = [
      stub({
        pedido: 10,
        rank_geral: 583,
        name: 'Dayara-like',
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
    expect(withGest.called[0]?.candidate.pedido).toBe(10)
    const withoutGest = simulateCall(all, 1, { includeGestanteFimFila: false })
    expect(withoutGest.called[0]?.candidate.pedido).toBe(11)
  })
})
