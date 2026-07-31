import type { Candidate, Meta } from '../types/candidate'
import { positionInRemaining, queueStatusOf } from './simulate'

// Sem travessão longo: usuário pediu pra nunca usar isso nos textos.
export function fmtNum(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return 'n/d'
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function fmtInt(n: number | null | undefined) {
  if (n == null) return 'n/d'
  return n.toLocaleString('pt-BR')
}

export type WhyBlock = {
  headline: string
  bullets: string[]
  sources: string[]
}

export function explainCandidate(c: Candidate, all: Candidate[], meta: Meta): WhyBlock {
  const bullets: string[] = []
  const sources: string[] = []
  const pos = positionInRemaining(all, c)

  if (c.called_t1) {
    if (c.called_t1_imediata) {
      bullets.push(
        `Você já entrou na T1 nas vagas imediatas como Classificado (${c.classified_as}). Fonte: Edital 17, Anexo I.`,
      )
    } else if (c.called_t1_cr) {
      bullets.push(
        `Você já entrou na T1 pelo cadastro de reserva (CR), lista ${c.t1_cr_list ?? 'n/d'}. A T1 juntou 500 imediatas + 250 CR. Fonte: Edital 02 + comunicado de convocação T1.`,
      )
    } else {
      bullets.push('Você já consta como convocado na T1.')
    }
    sources.push('Edital nº 17 – PC/CE, Anexo I')
    sources.push('Comunicado de convocação T1 (500 + 250 CR)')
  } else if (c.called_complementar) {
    bullets.push(
      `Você apareceu na chamada complementar (reposição de vagas da T1), segmento ${c.complementar_meta?.segment_call ?? 'n/d'}.`,
    )
    sources.push('Comunicado de chamada complementar')
  } else if (c.called_override) {
    bullets.push(
      c.override_meta?.reason ??
        'Marcado como já convocado por override manual (fonte comunitária / documento ainda não no repositório).',
    )
    if (c.override_meta?.source) {
      sources.push(c.override_meta.source)
    }
    sources.push('raw/overrides-already-called.json')
  } else if (c.called_inferred_gap) {
    bullets.push(
      c.gap_inference_meta?.caveat ??
        'Inferência por buraco na complementar: alguém com classificação pior foi convocado no mesmo segmento, então quem estava à frente é tratado como já saído (documento intermediário ausente).',
    )
    sources.push('Inferência a partir de raw/chamada-complementar-OIPCE.md')
  } else {
    if (queueStatusOf(c) === 'sub_judice') {
      bullets.push(
        'Você está sub judice: aparece na lista do papel, mas não ocupa vaga nas filas efetivas até decisão judicial (Edital 17, item 14). As posições de quem vem atrás já desconsideram isso.',
      )
      sources.push('Edital 17, item 14')
    } else {
      if (pos.amplaPos) {
        bullets.push(
          `Posição efetiva na ampla: nº ${pos.amplaPos} (sub judice à frente aparecem na ordem da nota, mas não recebem número de vaga; se o Estado chama N vagas, puxa até completar N pessoas que ocupam assento).`,
        )
      }
      if (pos.negroPos) {
        bullets.push(
          `Posição efetiva na cota racial: nº ${pos.negroPos} (rank negro ${c.rank_negro}, sem sub judice na conta).`,
        )
      }
      if (pos.pcdPos) {
        bullets.push(
          `Posição efetiva PcD: nº ${pos.pcdPos} (rank PcD ${c.rank_pcd}, sem sub judice na conta).`,
        )
      }
      const sjAhead = all.filter(
        (x) =>
          x.in_remaining_queue &&
          x.rank_geral < c.rank_geral &&
          (x.condition === 'Sub judice' || x.queue_status === 'sub_judice'),
      ).length
      if (sjAhead > 0) {
        bullets.push(
          `Há ${sjAhead} sub judice na sua frente no papel; eles não entram na sua posição efetiva.`,
        )
      }
    }
  }

  if (
    (c.segment === 'Negro' || c.segment === 'Negro e PcD') &&
    c.classified_as === 'Ampla'
  ) {
    bullets.push(
      'Você é do segmento negro, mas foi classificado na ampla porque a nota cabia lá. Isso NÃO consome vaga da cota racial.',
    )
    sources.push(meta.rules.quotas.cite_negro_ampla)
  }

  if (c.condition === 'Sub judice' && (c.already_called || !c.in_remaining_queue)) {
    bullets.push(
      'Participação sub judice: precária, depende do que o processo judicial decidir (Edital 17, item 14).',
    )
    sources.push('Edital 17, item 14')
  }

  if (c.queue_status === 'gestante_fim_fila' || c.gestante_condicional || c.taf === 'Gestante') {
    bullets.push(
      'TAF gestante: no papel a situação fica condicionada a novo teste (Edital 17, item 13). Na chamada de inspeção/docs da T1, gestantes com rank dentro da janela Ampla foram puladas (ex.: Dayara #583). O app trata isso como "gestante/fim de fila" (hipótese: adiamento operacional; sem DOE explícito de pedido de fim de fila).',
    )
    sources.push('Edital 17, item 13')
    sources.push('Padrão observado em raw/chamada-T1-OIPCE.md')
  }

  if (c.t1_call_skipped) {
    bullets.push(
      `Sua classificação geral (#${c.rank_geral}) cabia na janela da lista Ampla da T1, mas você não entrou na chamada de inspeção/docs (motivo mapeado: ${c.t1_call_skip_reason === 'gestante' ? 'gestante' : 'sub judice'}). As vagas da T1 não aumentaram: a lista só puxou o próximo nome.`,
    )
  }

  // same score neighbors
  const same = all
    .filter((x) => x.scores.total === c.scores.total && x.pedido !== c.pedido)
    .sort((a, b) => a.rank_geral - b.rank_geral)
  if (same.length) {
    const ahead = same.filter((x) => x.rank_geral < c.rank_geral)
    if (ahead.length) {
      bullets.push(
        `${ahead.length} pessoa(s) com a mesma nota final (${fmtNum(c.scores.total)}) ficaram na sua frente. A banca já aplicou o desempate do Edital 17, item 7 (objetiva, discursiva, LP, RL, LE, jurado, idade). A ordem publicada é a que vale.`,
      )
      sources.push(meta.rules.tiebreak.cite)
    } else {
      bullets.push(
        `Tem gente com a mesma nota (${fmtNum(c.scores.total)}), mas você ficou na frente no desempate oficial.`,
      )
      sources.push(meta.rules.tiebreak.cite)
    }
  }

  bullets.push(
    `Nota final ${fmtNum(c.scores.total)} = objetiva ${fmtNum(c.scores.objetiva, 0)} + discursiva ${fmtNum(c.scores.discursiva)}.`,
  )
  sources.push(meta.rules.ranking.cite)

  const headline = c.already_called
    ? c.called_inferred_gap && !c.called_t1 && !c.called_complementar && !c.called_override
      ? 'Situação: inferido como já saído (buraco na complementar)'
      : c.called_override && !c.called_t1 && !c.called_complementar
        ? 'Situação: já no curso (override; documento oficial ainda pendente no repo)'
        : 'Situação: já convocado (T1 ou complementar)'
    : queueStatusOf(c) === 'sub_judice'
      ? `Sub judice · geral oficial #${c.rank_geral} (não ocupa vaga efetiva)`
      : `Posição efetiva: ampla #${pos.amplaPos ?? 'n/d'}${
          pos.negroPos ? ` · negro #${pos.negroPos}` : ''
        }${pos.pcdPos ? ` · PcD #${pos.pcdPos}` : ''}`

  return {
    headline,
    bullets,
    sources: [...new Set(sources)],
  }
}

export function neighbors(all: Candidate[], c: Candidate, n = 4) {
  // Quem já foi chamado "pulou do barco": vizinhos só na fila restante.
  const pool = all
    .filter((x) => x.in_remaining_queue || x.pedido === c.pedido)
    .sort((a, b) => a.rank_geral - b.rank_geral)
  const idx = pool.findIndex((x) => x.pedido === c.pedido)
  if (idx < 0) return { ahead: [], behind: [] }
  return {
    // ordem crescente: ... 683, 684, 685, VOCÊ, 687, 688 ...
    ahead: pool.slice(Math.max(0, idx - n), idx),
    behind: pool.slice(idx + 1, idx + 1 + n),
  }
}
