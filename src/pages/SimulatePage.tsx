import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { fmtNum } from '../lib/explain'
import { simulateCall, splitSeats, queueStatusLabel, queueStatusOf } from '../lib/simulate'

export function SimulatePage() {
  const { candidates, meta, loading } = useData()
  const [params] = useSearchParams()
  const initialN = Number(params.get('n') || 500)
  const focusPedido = params.get('pedido')
  const [n, setN] = useState(Number.isFinite(initialN) && initialN > 0 ? initialN : 500)
  const [includeSubJudice, setIncludeSubJudice] = useState(true)
  const [includeGestanteFimFila, setIncludeGestanteFimFila] = useState(true)

  const sim = useMemo(
    () => simulateCall(candidates, n, { includeSubJudice, includeGestanteFimFila }),
    [candidates, n, includeSubJudice, includeGestanteFimFila],
  )
  const split = splitSeats(n)
  const focus = focusPedido
    ? sim.called.find((s) => String(s.candidate.pedido) === focusPedido)
    : null
  const skipSummary = meta?.t1_boundaries?.ampla_skips_summary

  if (loading) return <p className="text-ink-soft">Carregando...</p>

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl">Simular T2</h1>
        <p className="text-ink-soft max-w-2xl text-sm md:text-base">
          Arrasta ou digita quantas vagas a turma teria. O app reparte como a T1:
          cerca de 75% ampla, 20% negro, 5% PcD. A fila já desconta as ~750 da T1
          (500 imediatas + 250 CR), a complementar e overrides confirmados.
        </p>
      </header>

      <section className="rounded-2xl border-2 border-sea/40 bg-paper-2 p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Número de vagas (dá pra mudar, sério)
            </p>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="number"
                min={1}
                max={2000}
                value={n}
                onChange={(e) => setN(Math.max(1, Math.min(2000, Number(e.target.value) || 1)))}
                className="w-28 rounded-lg border border-line bg-paper px-3 py-2 text-2xl font-bold outline-none focus:border-sea"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeSubJudice}
                onChange={(e) => setIncludeSubJudice(e.target.checked)}
              />
              Incluir sub judice
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeGestanteFimFila}
                onChange={(e) => setIncludeGestanteFimFila(e.target.checked)}
              />
              Incluir gestante / fim de fila
            </label>
          </div>
        </div>

        <input
          type="range"
          min={1}
          max={2000}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-full accent-sea"
        />

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <SplitCard label="Ampla" value={split.ampla} />
          <SplitCard label="Negro" value={split.negro} />
          <SplitCard label="PcD" value={split.pcd} />
        </div>

        {skipSummary && (
          <p className="text-xs text-ink-soft leading-relaxed rounded-lg border border-line bg-paper px-3 py-2">
            Na T1 Ampla, {skipSummary.total} nomes com rank dentro da janela foram
            pulados na inspeção/docs ({skipSummary.sub_judice} sub judice,{' '}
            {skipSummary.gestante} gestante). Isso não aumenta o total de vagas: a
            lista só foi mais fundo. No simulador você escolhe se esses perfis
            entram na projeção de T2.
          </p>
        )}

        <p className="text-xs text-ink-soft leading-relaxed">
          {meta?.calling_model_observed?.description} Fonte:{' '}
          {meta?.calling_model_observed?.cite}
        </p>
      </section>

      {focus && (
        <div className="rounded-xl border border-sea bg-sea/10 px-4 py-3 text-sm">
          <strong>{focus.candidate.name}</strong> entraria nesta simulação pela lista{' '}
          <strong>{focus.list}</strong>.
        </div>
      )}
      {focusPedido && !focus && (
        <div className="rounded-xl border border-warn/40 bg-warn/5 px-4 py-3 text-sm">
          Com {n} vagas, o pedido {focusPedido} ainda fica de fora nesta projeção
          {(!includeSubJudice || !includeGestanteFimFila) &&
            ' (ou foi excluído pelos filtros de status)'}
          .
        </div>
      )}

      <section className="grid sm:grid-cols-3 gap-3 text-sm">
        <Stat label="Convocados na simulação" value={String(sim.called.length)} />
        <Stat label="% mulheres nesta turma" value={`${sim.womenPctInCall.toFixed(1)}%`} />
        <Stat
          label="% mulheres acumulado (T1+comp+T2)"
          value={`${sim.cumulativeWomenPct.toFixed(1)}% ${sim.womenFloorOk ? '(piso 15% ok)' : '(abaixo do piso!)'}`}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-2xl">Quem entraria</h2>
        <ul className="space-y-1.5 max-h-[28rem] overflow-auto pr-1">
          {sim.called.map((s, i) => {
            const status = queueStatusOf(s.candidate)
            return (
              <li key={`${s.candidate.pedido}-${s.list}`}>
                <Link
                  to={`/candidato/${s.candidate.pedido}`}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 rounded-lg border px-3 py-2.5 text-sm text-center sm:text-left ${
                    focusPedido === String(s.candidate.pedido)
                      ? 'border-sea bg-sea/10'
                      : 'border-line bg-paper-2/80 hover:border-sea/40'
                  }`}
                >
                  <span className="text-[#1a2332]">
                    <span className="text-ink-soft mr-2">{i + 1}.</span>
                    {s.candidate.name}
                    <span className="text-ink-soft">
                      {' '}
                      · {s.list} · geral #{s.candidate.rank_geral}
                      {status !== 'regular' ? ` · ${queueStatusLabel(status)}` : ''}
                    </span>
                  </span>
                  <span className="font-display font-semibold text-[#1a2332]">
                    {fmtNum(s.candidate.scores.total)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function SplitCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-2 py-3">
      <p className="text-[11px] text-ink-soft uppercase tracking-wide">{label}</p>
      <p className="font-display text-2xl">{value}</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper-2 px-3 py-3">
      <p className="text-[11px] text-ink-soft">{label}</p>
      <p className="font-medium mt-1">{value}</p>
    </div>
  )
}
