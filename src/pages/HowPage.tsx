import { useData } from '../lib/data'

export function HowPage() {
  const { meta } = useData()
  if (!meta) return null

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-3xl md:text-4xl">Como funciona (e de onde veio)</h1>
      <p className="text-ink-soft">
        Se alguém disser que inventaram critério, manda essa página. Tudo aqui cita
        documento oficial.
      </p>

      <Block title="1. Ranking">
        <p>{meta.rules.ranking.summary}</p>
        <Cite>{meta.rules.ranking.cite}</Cite>
      </Block>

      <Block title="2. Desempate (mesma nota)">
        <ol className="list-decimal pl-5 space-y-1">
          {meta.rules.tiebreak.order.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-ink-soft">
          O DOE publica a ordem já desempatada. Quando duas pessoas têm a mesma nota
          final, o app mostra isso na ficha e aponta o item 7. Não reinventa o
          desempate por baixo do pano.
        </p>
        <Cite>{meta.rules.tiebreak.cite}</Cite>
      </Block>

      <Block title="3. Negro na ampla">
        <p>{meta.rules.quotas.negro_in_ampla}</p>
        <Cite>{meta.rules.quotas.cite_negro_ampla}</Cite>
      </Block>

      <Block title="4. Cota feminina (piso 15%)">
        <p>
          É mínimo, não teto. Mulher concorre a tudo e conta pro piso. Na T1 já saiu cerca
          de {meta.calling_model_observed?.women_t1_pct}% de mulheres, então o piso está
          folgado. O simulador monitora o acumulado.
        </p>
        <Cite>{meta.rules.quotas.cite_women}</Cite>
      </Block>

      <Block title="5. Como a T1 foi chamada (modelo do app)">
        <p>{meta.calling_model_observed?.description}</p>
        <Cite>{meta.calling_model_observed?.cite}</Cite>
        <p className="mt-2 text-sm">
          Números do Edital 02: 500 imediatas (375 ampla + 100 negro + 25 PcD) + 250 CR
          (187 ampla + 50 negro + 13 PcD) = 750 na primeira convocação. A complementar
          veio depois, por desistência/vaga não preenchida.
        </p>
        <p className="mt-2 text-sm">
          Complementar: {meta.calling_model_observed?.complementar}
        </p>
        {meta.t1_boundaries && (
          <div className="mt-3 rounded-xl border border-line bg-paper-2 px-3 py-3 text-sm space-y-1">
            <p className="font-medium">Últimos da chamada de inspeção/docs (T1):</p>
            <p>
              Ampla: geral #
              {meta.t1_boundaries.last_from_call_meta?.Ampla?.rank_geral}{' '}
              {meta.t1_boundaries.last_from_call_meta?.Ampla?.name} (
              {meta.t1_boundaries.counts_from_call_meta?.Ampla} nomes)
            </p>
            <p>
              Negro: geral #
              {meta.t1_boundaries.last_from_call_meta?.Negro?.rank_geral}{' '}
              {meta.t1_boundaries.last_from_call_meta?.Negro?.name} (
              {meta.t1_boundaries.counts_from_call_meta?.Negro} nomes)
            </p>
            <p>
              PcD: geral #
              {meta.t1_boundaries.last_from_call_meta?.PcD?.rank_geral}{' '}
              {meta.t1_boundaries.last_from_call_meta?.PcD?.name} (
              {meta.t1_boundaries.counts_from_call_meta?.PcD} nomes)
            </p>
            <p className="text-ink-soft text-xs pt-1">{meta.t1_boundaries.note}</p>
          </div>
        )}
        {meta.t1_boundaries?.ampla_skips_summary && (
          <div className="mt-3 rounded-xl border border-line bg-paper-2 px-3 py-3 text-sm space-y-2">
            <p className="font-medium">Quem a T1 Ampla pulou (padrão observado)</p>
            <p>
              {meta.t1_boundaries.ampla_skips_summary.total} nomes com rank dentro da
              janela Ampla não entraram na inspeção/docs:{' '}
              {meta.t1_boundaries.ampla_skips_summary.sub_judice} sub judice,{' '}
              {meta.t1_boundaries.ampla_skips_summary.gestante} gestante. Ex.: Dayara
              Kelly (#583, gestante).
            </p>
            <p className="text-ink-soft text-xs">
              {meta.t1_boundaries.skip_hypothesis}
            </p>
            <ul className="text-xs space-y-1 max-h-40 overflow-auto">
              {(meta.t1_boundaries.ampla_skips_inside_t1_window ?? []).map((s) => (
                <li key={String(s.pedido)}>
                  #{String(s.rank_geral)} {String(s.name)} · {String(s.reason)}
                  {s.already_called ? ' · já marcada chamada' : ' · ainda na fila'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Block>

      <Block title="6. O que o app NÃO sabe">
        <p>{meta.rules.calling_model.caveat}</p>
        <p className="mt-2 text-sm text-ink-soft">
          Sem lista de desistentes/inaptos, a posição é a do papel. Se alguém à sua frente
          cair, você sobe. O app não inventa desistência. Gestante/fim de fila é hipótese
          operacional (TAF gestante + padrão de skip na T1), não um carimbo oficial de
          "pediu fim de fila".
        </p>
        {meta.gap_inference && (
          <div className="mt-3 rounded-xl border border-warn/40 bg-[#f8e8e5] px-3 py-3 text-sm space-y-2">
            <p className="font-medium">Buracos na complementar (inferência)</p>
            <p>{meta.gap_inference.description}</p>
            <p className="text-xs text-ink-soft">
              Marcados assim: Ampla {meta.gap_inference.by_segment?.Ampla ?? 0}, Negro{' '}
              {meta.gap_inference.by_segment?.Negro ?? 0}, PcD{' '}
              {meta.gap_inference.by_segment?.PcD ?? 0}.
            </p>
          </div>
        )}
      </Block>

      <Block title="Fontes no repositório">
        <ul className="space-y-1 text-sm">
          {meta.sources.map((s) => (
            <li key={s.id}>
              <span className="font-medium">{s.title}</span>
              <span className="text-ink-soft"> · {s.file}</span>
            </li>
          ))}
        </ul>
      </Block>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper-2 p-4 md:p-5 space-y-2">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

function Cite({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-sea font-medium pt-1 border-t border-line/80 mt-2">
      Fonte: {children}
    </p>
  )
}
