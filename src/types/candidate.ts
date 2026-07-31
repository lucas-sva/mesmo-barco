export type Segment = 'Ampla' | 'Negro' | 'PcD' | 'Negro e PcD'

export type Scores = {
  lp: number | null
  inf: number | null
  rl: number | null
  dc: number | null
  da: number | null
  dp: number | null
  pp: number | null
  lep: number | null
  le: number | null
  cont: number | null
  cri: number | null
  ml: number | null
  est: number | null
  objetiva: number | null
  discursiva: number | null
  total: number
}

export type Candidate = {
  pedido: number
  name: string
  name_norm: string
  condition: string
  segment: Segment | string
  birth_date: string | null
  scores: Scores
  taf: string | null
  psychological: string | null
  social_investigation: string | null
  sex: 'M' | 'F'
  rank_geral: number
  rank_pcd: number | null
  rank_negro: number | null
  situation: 'classificado' | 'cadastro_reserva' | string
  classified_as: 'Ampla' | 'Negro' | 'PcD' | null
  gestante_condicional?: boolean
  /** regular | sub_judice | gestante_fim_fila | inapto */
  queue_status?: string
  t1_call_skipped?: boolean
  t1_call_skip_reason?: 'sub_judice' | 'gestante' | string | null
  called_t1: boolean
  called_t1_imediata?: boolean
  called_t1_cr?: boolean
  t1_cr_list?: string | null
  called_complementar: boolean
  called_override?: boolean
  override_meta?: { reason?: string; source?: string }
  called_inferred_gap?: boolean
  gap_inference_meta?: {
    segment: string
    rank_field: string
    rank: number
    evidence_max_rank: number
    caveat: string
  }
  already_called: boolean
  in_remaining_queue: boolean
  source_scores?: string | null
  source_ranking?: string
  complementar_meta?: {
    segment_call: string
    rank_in_segment_list: number
  }
  t1_call_meta?: {
    segment_call: string
    rank_in_segment_list: number
  }
}

export type Meta = {
  contest: string
  rules: {
    ranking: { summary: string; cite: string }
    tiebreak: { order: string[]; cite: string }
    quotas: {
      pcd_pct: number
      negro_pct: number
      women_floor_pct: number
      negro_in_ampla: string
      cite_negro_ampla: string
      cite_women: string
      cite_alternancia: string
    }
    t1_vacancies: { ampla: number; pcd: number; negro: number; total: number }
    calling_model: { summary: string; caveat: string }
  }
  stats: Record<string, unknown>
  t1_boundaries?: {
    t1_call_rows: number
    counts_from_call_meta: Record<string, number>
    last_from_call_meta: Record<
      string,
      { pedido: number; name: string; rank_geral: number; segment: string; score?: number } | null
    >
    first_remaining_ampla_regular_apto?: {
      pedido: number
      name: string
      rank_geral: number
    } | null
    ampla_skips_inside_t1_window?: Array<Record<string, unknown>>
    ampla_skips_summary?: {
      total: number
      sub_judice: number
      gestante: number
      still_in_queue: number
      marked_called_via_edital_or_override: number
    }
    queue_status_remaining?: {
      gestante_fim_fila: number
      sub_judice: number
    }
    skip_hypothesis?: string
    beatriz_carvalho_de_morais_6906?: Record<string, unknown> | null
    note: string
  }
  gap_inference?: {
    description: string
    label?: string
    inferred: Array<Record<string, unknown>>
    by_segment: Record<string, number>
  }
  calling_model_observed?: {
    description: string
    cite: string
    t1_ampla_rule: string
    t1_negro_rule: string
    t1_pcd_rule: string
    complementar: string
    women_t1_pct: number
    women_floor_pct: number
  }
  sources: { id: string; title: string; file: string }[]
}

export type SeatList = 'Ampla' | 'Negro' | 'PcD'

export type SimulatedSeat = {
  list: SeatList
  candidate: Candidate
  seatIndex: number
  /** false = shown for transparency, does not consume a vacancy (sub judice). */
  occupiesSeat?: boolean
}

export type SimulationResult = {
  n: number
  seats: { ampla: number; negro: number; pcd: number }
  called: SimulatedSeat[]
  womenInCall: number
  womenPctInCall: number
  cumulativeWomenPct: number
  womenFloorOk: boolean
}
