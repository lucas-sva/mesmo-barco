import { Link, useParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { explainCandidate, fmtInt, fmtNum, neighbors } from '../lib/explain'
import {
  amplaPorFaltaPhrase,
  occupiesSeat,
  positionInRemaining,
  vacantQuotaShort,
  vacanciesNeededFor,
} from '../lib/simulate'

const SCORE_LABELS: { key: keyof import('../types/candidate').Scores; label: string }[] = [
  { key: 'objetiva', label: 'Objetiva' },
  { key: 'discursiva', label: 'Discursiva' },
  { key: 'total', label: 'Total' },
  { key: 'lp', label: 'LP' },
  { key: 'inf', label: 'Inf' },
  { key: 'rl', label: 'RL' },
  { key: 'dc', label: 'Dir. Const.' },
  { key: 'da', label: 'Dir. Adm.' },
  { key: 'dp', label: 'Dir. Penal' },
  { key: 'pp', label: 'Proc. Penal' },
  { key: 'lep', label: 'LEP' },
  { key: 'le', label: 'Leg. Estadual' },
  { key: 'cont', label: 'Contabilidade' },
  { key: 'cri', label: 'Criminologia' },
  { key: 'ml', label: 'Med. Legal' },
  { key: 'est', label: 'Estatística' },
]

export function CandidatePage() {
  const { pedido } = useParams()
  const { candidates, meta, loading } = useData()
  const c = candidates.find((x) => String(x.pedido) === pedido)

  if (loading) return <p className="text-ink-soft">Carregando...</p>
  if (!c || !meta) {
    return (
      <div className="space-y-3">
        <p>Candidato não encontrado.</p>
        <Link to="/" className="text-sea underline">
          Voltar
        </Link>
      </div>
    )
  }

  const why = explainCandidate(c, candidates, meta)
  const nb = neighbors(candidates, c, 4)
  const pos = positionInRemaining(candidates, c)
  const need = c.in_remaining_queue
    ? vacanciesNeededFor(candidates, c.pedido, { maxN: 2000 })
    : null

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-sea hover:underline">
        ← busca
      </Link>

      <header className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl leading-tight">{c.name}</h1>
        <p className="text-ink-soft text-sm">
          Pedido {c.pedido} · nasc. {c.birth_date ?? 'n/d'} · {c.condition} · segmento{' '}
          {c.segment}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip>Geral oficial #{c.rank_geral}</Chip>
          {c.in_remaining_queue && occupiesSeat(c) && pos.amplaPos != null && (
            <Chip tone="sea">Ampla efetiva #{pos.amplaPos}</Chip>
          )}
          {c.rank_negro != null && <Chip>Negro #{c.rank_negro}</Chip>}
          {c.rank_pcd != null && <Chip>PcD #{c.rank_pcd}</Chip>}
          <Chip>{c.sex === 'F' ? 'Feminino' : 'Masculino'}</Chip>
          {c.already_called ? (
            <Chip tone="sea">
              {c.called_t1
                ? c.called_t1_cr
                  ? `T1 · CR (${c.t1_cr_list ?? 'n/d'})`
                  : `T1 · ${c.classified_as}`
                : c.called_complementar
                  ? 'Complementar'
                  : c.called_inferred_gap
                    ? 'No curso (doc. ausente)'
                    : 'Curso (override)'}
            </Chip>
          ) : (
            <Chip tone="warn">Ainda na fila</Chip>
          )}
          {c.queue_status && c.queue_status !== 'regular' && (
            <Chip>
              {c.queue_status === 'gestante_fim_fila'
                ? 'Gestante / fim de fila'
                : c.queue_status === 'sub_judice'
                  ? 'Sub judice'
                  : c.queue_status}
            </Chip>
          )}
          {c.t1_call_skipped && <Chip tone="warn">Pulada na inspeção T1</Chip>}
        </div>
      </header>

      <section className="rounded-2xl border border-line bg-paper-2 p-4 md:p-5 space-y-3">
        <h2 className="font-display text-2xl">Por que você está aqui</h2>
        <p className="font-medium text-sea">{why.headline}</p>
        <ul className="space-y-2 text-sm leading-relaxed">
          {why.bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-sea mt-1">▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="pt-2 border-t border-line">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Fontes (não saiu do nada)
          </p>
          <ul className="mt-1 text-xs text-ink-soft space-y-0.5">
            {why.sources.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </div>
      </section>

      {need && need.list && (
        <section className="rounded-2xl border border-sea/30 bg-sea/5 p-4 md:p-5">
          <p className="text-sm text-ink-soft">Pra você entrar nesta projeção</p>
          <p className="text-3xl font-bold mt-1">
            {need.n === 1
              ? 'turma de pelo menos 1 vaga'
              : `turma de pelo menos ${fmtInt(need.n)} vagas`}
          </p>
          {need.fromVacantQuota ? (
            <p className="text-sm mt-2 text-ink-soft">
              Entraria pela <strong>{amplaPorFaltaPhrase(need.fromVacantQuota)}</strong>
              : a lista de {vacantQuotaShort(need.fromVacantQuota)} esgotou e a vaga
              remanescente foi pra você na ordem geral. Não é ampla normal nem cotista
              que entra na ampla pela nota.
              {need.overflow && need.vacancies.total > 0
                ? ` Ainda assim ${fmtInt(need.n)} vagas passam do restante da fila (${fmtInt(need.remainingOccupying)} ocupam vaga): ${fmtInt(need.vacancies.total)} vagas ociosas de verdade, sem gente restante.`
                : ''}
            </p>
          ) : need.overflow ? (
            <p className="text-sm mt-2 text-ink-soft">
              Entraria pela lista <strong>{need.list}</strong>, mas {fmtInt(need.n)}{' '}
              vagas passam do restante da fila ({fmtInt(need.remainingOccupying)}{' '}
              ocupam vaga · {fmtInt(need.remainingPaper)} no papel). Ociosa só o que
              não tiver gente de verdade
              {need.vacancies.total > 0
                ? ` (${fmtInt(need.vacancies.total)} vagas ociosas: ${fmtInt(need.vacancies.ampla)} ampla, ${fmtInt(need.vacancies.negro)} negro, ${fmtInt(need.vacancies.pcd)} PcD)`
                : ''}
              ; não inventamos concorrente.
            </p>
          ) : (
            <p className="text-sm mt-2 text-ink-soft">
              Entraria pela lista <strong>{need.list}</strong>, seguindo o mesmo padrão
              da T1 (ampla pelos melhores gerais; cotas pelas filas próprias; vaga de
              cota sem gente naquela lista reverte pra ordem geral). Detalhe no
              simulador.
            </p>
          )}
          <Link
            to={`/simular?n=${need.n}&pedido=${c.pedido}`}
            className="inline-block mt-3 text-sm font-medium text-sea underline"
          >
            Abrir simulador nessa marca
          </Link>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Suas métricas</h2>
        <p className="text-xs text-ink-soft">
          Notas do Comunicado 166/2026-CEV/UECE. Classificação definitiva: Edital 17.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {SCORE_LABELS.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-xl border border-line bg-paper-2 px-3 py-2"
            >
              <p className="text-[11px] text-ink-soft">{label}</p>
              <p className="font-display text-lg">
                {key === 'objetiva' || key === 'lp' || key === 'inf' || key === 'rl' || key === 'dc' || key === 'da' || key === 'dp' || key === 'pp' || key === 'lep' || key === 'le' || key === 'cont' || key === 'cri' || key === 'ml' || key === 'est'
                  ? fmtInt(c.scores[key] as number | null)
                  : fmtNum(c.scores[key] as number | null)}
              </p>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-2 text-sm">
          <MetaRow label="TAF" value={c.taf ?? 'n/d'} />
          <MetaRow label="Psicológico" value={c.psychological ?? 'n/d'} />
          <MetaRow label="Invest. Social" value={c.social_investigation ?? 'n/d'} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Na fila (ordem da nota)</h2>
        <p className="text-xs text-ink-soft">
          Ordem do papel. Sub judice aparecem, mas a posição efetiva (chip verde) não
          conta vaga pra eles.
        </p>
        {nb.ahead.length === 0 && nb.behind.length === 0 ? (
          <p className="text-sm text-ink-soft">Sem vizinhos pra mostrar neste recorte.</p>
        ) : (
          <>
            <NeighborList title="Na sua frente" items={nb.ahead} />
            {nb.ahead.length === 0 && c.in_remaining_queue && (
              <p className="text-sm text-sea font-medium">
                Ninguém na sua frente nesta fila. Você é o próximo da ampla (no papel).
              </p>
            )}
            <NeighborList title="Logo atrás" items={nb.behind} />
          </>
        )}
      </section>
    </div>
  )
}

function Chip({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'sea' | 'warn'
}) {
  const cls =
    tone === 'sea'
      ? 'bg-sea/15 text-sea'
      : tone === 'warn'
        ? 'bg-warn/10 text-warn'
        : 'bg-ink/5 text-ink-soft'
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>
      {children}
    </span>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper-2 px-3 py-2">
      <p className="text-[11px] text-ink-soft">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function NeighborList({
  title,
  items,
}: {
  title: string
  items: import('../types/candidate').Candidate[]
}) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-sm font-medium mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((x) => {
          const sj = x.condition === 'Sub judice' || x.queue_status === 'sub_judice'
          return (
            <li key={x.pedido}>
              <Link
                to={`/candidato/${x.pedido}`}
                className={`flex justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:border-sea/40 ${
                  sj
                    ? 'border-dashed border-line bg-paper/60'
                    : 'border-line bg-paper-2/70'
                }`}
              >
                <span>
                  #{x.rank_geral} {x.name}
                  <span className="text-ink-soft">
                    {' '}
                    · {x.segment}
                    {sj ? ' · sub judice (não ocupa vaga)' : ''}
                  </span>
                </span>
                <span className="font-bold">{fmtNum(x.scores.total)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
