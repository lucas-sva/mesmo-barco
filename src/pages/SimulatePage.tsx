import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CandidateQueueRow } from '../components/CandidateQueueRow'
import { useData } from '../lib/data'
import { fmtInt } from '../lib/explain'
import {
  amplaPorFaltaPhrase,
  isCotistaNaAmplaPorNota,
  queueStatusOf,
  simNCap,
  simulateCall,
  splitSeats,
} from '../lib/simulate'

export function SimulatePage() {
  const { candidates, meta, loading } = useData()
  const [params] = useSearchParams()
  const initialN = Number(params.get('n') || 500)
  const focusPedido = params.get('pedido')
  const [n, setN] = useState(Number.isFinite(initialN) && initialN > 0 ? initialN : 500)
  const [includeSubJudice, setIncludeSubJudice] = useState(true)

  const maxN = useMemo(
    () => simNCap(candidates, { includeGestanteFimFila: true }),
    [candidates],
  )

  useEffect(() => {
    if (candidates.length === 0) return
    setN((cur) => Math.max(1, Math.min(cur, maxN)))
  }, [candidates.length, maxN])

  const nUsed = candidates.length === 0 ? n : Math.max(1, Math.min(n, maxN))
  const sim = useMemo(
    () =>
      simulateCall(candidates, nUsed, {
        includeSubJudice,
        includeGestanteFimFila: true,
      }),
    [candidates, nUsed, includeSubJudice],
  )
  const split = splitSeats(nUsed)
  const focusCandidate = focusPedido
    ? candidates.find((c) => String(c.pedido) === focusPedido)
    : null
  const focus = focusPedido
    ? sim.called.find(
        (s) =>
          String(s.candidate.pedido) === focusPedido && s.occupiesSeat !== false,
      )
    : null
  const focusAsGhost =
    focusPedido && !focus
      ? sim.called.find(
          (s) =>
            String(s.candidate.pedido) === focusPedido && s.occupiesSeat === false,
        )
      : null
  const seatCount = sim.called.filter((s) => s.occupiesSeat !== false).length
  const skipSummary = meta?.t1_boundaries?.ampla_skips_summary
  const focusName = focusCandidate?.name ?? `pedido ${focusPedido}`
  const vagasLabel = nUsed === 1 ? '1 vaga' : `${nUsed} vagas`

  if (loading) return <p className="text-ink-soft">Carregando...</p>

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl md:text-4xl">Simular T2</h1>
      </header>

      {focus && (
        <div className="rounded-2xl border-[3px] border-sea bg-[#d8efe8] px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-sea mb-2">
            Resultado pra você
          </p>
          <p className="text-xl md:text-2xl font-bold text-[#1a2332] leading-snug">
            Com {vagasLabel},{' '}
            <span className="text-sea">{focus.candidate.name}</span> entraria pela{' '}
            {focus.fromVacantQuota
              ? amplaPorFaltaPhrase(focus.fromVacantQuota)
              : isCotistaNaAmplaPorNota(focus)
                ? 'ampla (cotista pela nota, sem comer cota)'
                : `lista ${focus.list}`}
            .
          </p>
          {sim.vacancies.total > 0 && (
            <p className="text-sm text-ink-soft mt-2">
              Essa turma não enche: {fmtInt(sim.vacancies.total)} vaga
              {sim.vacancies.total === 1 ? '' : 's'} ociosa
              {sim.vacancies.total === 1 ? '' : 's'} de verdade (não tem mais ninguém
              na fila restante).
            </p>
          )}
        </div>
      )}
      {focusPedido && !focus && (
        <div className="rounded-2xl border-[3px] border-warn bg-[#f3d4cf] px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-warn mb-2">
            Resultado pra você
          </p>
          <p className="text-xl md:text-2xl font-bold text-[#1a2332] leading-snug">
            {focusAsGhost ||
            (focusCandidate && queueStatusOf(focusCandidate) === 'sub_judice') ? (
              <>
                <span className="text-warn">{focusName}</span> está sub judice:
                aparece na lista, mas não ocupa vaga nesta projeção.
              </>
            ) : (
              <>
                Com {vagasLabel}, <span className="text-warn">{focusName}</span>{' '}
                ainda fica de fora nesta projeção.
              </>
            )}
          </p>
        </div>
      )}

      <section className="rounded-2xl border-2 border-sea/40 bg-paper-2 p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Número de vagas
            </p>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="number"
                min={1}
                max={maxN}
                value={Math.min(n, maxN)}
                onChange={(e) =>
                  setN(Math.max(1, Math.min(maxN, Number(e.target.value) || 1)))
                }
                className="w-28 rounded-lg border border-line bg-paper px-3 py-2 text-2xl font-bold outline-none focus:border-sea"
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm max-w-xs">
            <input
              type="checkbox"
              className="mt-1"
              checked={includeSubJudice}
              onChange={(e) => setIncludeSubJudice(e.target.checked)}
            />
            <span>
              Incluir sub judice na lista
              <span className="block text-[11px] text-ink-soft font-normal">
                Só mostra na lista; não ocupam vaga e não mudam o teto. Posições já
                descontam.
              </span>
            </span>
          </label>
        </div>

        <input
          type="range"
          min={1}
          max={maxN}
          value={Math.min(n, maxN)}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-full accent-sea"
        />
        <p className="text-xs text-ink-soft">
          Teto: {fmtInt(maxN)} — gente ainda na fila que ocupa vaga (todas as
          listas). N da URL acima do teto é limitado a esse valor.
        </p>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-sm min-w-0">
          <SplitCard label="Ampla" value={split.ampla} vacant={sim.vacancies.ampla} />
          <SplitCard
            label="Negro"
            value={split.negro}
            vacant={sim.vacancies.negro}
            remapped={sim.remapped.negro}
          />
          <SplitCard
            label="PcD"
            value={split.pcd}
            vacant={sim.vacancies.pcd}
            remapped={sim.remapped.pcd}
          />
        </div>

        {(sim.vacancies.total > 0 || sim.remapped.negro + sim.remapped.pcd > 0) && (
          <div
            className={`rounded-xl border px-3 py-3 text-sm leading-relaxed ${
              sim.vacancies.total > 0
                ? 'border-warn/40 bg-warn/5'
                : 'border-sea/30 bg-sea/5'
            }`}
          >
            {sim.remapped.negro + sim.remapped.pcd > 0 && (
              <>
                <p className="font-medium text-sea">
                  {sim.remapped.negro + sim.remapped.pcd === 1
                    ? '1 vaga foi movida para a ampla'
                    : `${fmtInt(sim.remapped.negro + sim.remapped.pcd)} vagas foram movidas para a ampla`}{' '}
                  (lista PPP/PcD esgotou)
                  {sim.remapped.negro > 0
                    ? ` · PPP ${fmtInt(sim.remapped.negro)}`
                    : ''}
                  {sim.remapped.pcd > 0 ? ` · PcD ${fmtInt(sim.remapped.pcd)}` : ''}
                </p>
                <div className="mt-2 space-y-2 text-[11px] text-ink-soft leading-relaxed">
                  <p>
                    Não inventamos a regra. Edital nº 1 OIPCE (PC/CE): PPP primeiro
                    chama o próximo da lista de reserva; só o que sobrar vira ampla.
                    PcD é o mesmo esquema.
                  </p>
                  <blockquote className="border-l-2 border-sea/40 pl-2.5">
                    <span className="font-semibold text-sea">5.2.6.</span> Em caso de
                    não preenchimento de vaga reservada a candidatos negros (pretos e
                    pardos) no certame, a vaga não preenchida será ocupada pela pessoa
                    negra aprovada na posição imediatamente subsequente na lista de
                    reserva de vagas, de acordo com a ordem de classificação.
                  </blockquote>
                  <blockquote className="border-l-2 border-sea/40 pl-2.5">
                    <span className="font-semibold text-sea">5.2.6.1.</span> Na hipótese
                    de não haver candidatos negros (pretos ou pardos) aprovados em
                    número suficiente para que sejam ocupadas as vagas reservadas, as
                    vagas remanescentes serão revertidas para ampla concorrência e
                    serão preenchidas pelos demais candidatos aprovados, observada a
                    ordem de classificação geral.
                  </blockquote>
                  <blockquote className="border-l-2 border-sea/40 pl-2.5">
                    <span className="font-semibold text-sea">5.1.6.9.</span> As vagas
                    definidas no subitem 5.1.1 deste Edital que não forem providas por
                    falta de candidatos com deficiência aprovados serão preenchidas
                    pelos demais candidatos, observada a ordem geral.
                  </blockquote>
                </div>
              </>
            )}
            {sim.vacancies.total > 0 && (
              <>
                <p className={`font-medium text-warn ${sim.remapped.negro + sim.remapped.pcd > 0 ? 'mt-2' : ''}`}>
                  {sim.vacancies.total === 1
                    ? '1 vaga ociosa nesta marca'
                    : `${fmtInt(sim.vacancies.total)} vagas ociosas nesta marca`}
                </p>
                <p className="text-ink-soft mt-1">
                  Não tem mais ninguém na fila restante pra ocupar. Ociosa de verdade;
                  não inventamos concorrente
                  {sim.vacancies.ampla > 0 ? ` · ampla ${fmtInt(sim.vacancies.ampla)}` : ''}
                  {sim.vacancies.negro > 0 ? ` · negro ${fmtInt(sim.vacancies.negro)}` : ''}
                  {sim.vacancies.pcd > 0 ? ` · PcD ${fmtInt(sim.vacancies.pcd)}` : ''}
                  .
                </p>
              </>
            )}
          </div>
        )}

        {skipSummary && (
          <p className="text-xs text-ink-soft leading-relaxed rounded-lg border border-line bg-paper px-3 py-2">
            Na T1 Ampla, {skipSummary.total} nomes com rank dentro da janela foram
            pulados na inspeção/docs ({skipSummary.sub_judice} sub judice,{' '}
            {skipSummary.gestante} gestante). Sub judice nunca consomem vaga nesta
            projeção: só aparecem na lista se o filtro estiver ligado. Gestante/fim
            de fila sempre entram na conta de vagas.
          </p>
        )}

        <p className="text-xs text-ink-soft leading-relaxed">
          {meta?.calling_model_observed?.description} Fonte:{' '}
          {meta?.calling_model_observed?.cite}
        </p>
      </section>

      <section className="grid sm:grid-cols-3 gap-3 text-sm">
        <Stat
          label="Vagas preenchidas na simulação"
          value={
            sim.vacancies.total > 0
              ? `${seatCount} de ${nUsed}`
              : String(seatCount)
          }
        />
        <Stat label="% mulheres nesta turma" value={`${sim.womenPctInCall.toFixed(1)}%`} />
        <Stat
          label="% mulheres acumulado (T1+comp+T2)"
          value={`${sim.cumulativeWomenPct.toFixed(1)}% ${sim.womenFloorOk ? '(piso 15% ok)' : '(abaixo do piso!)'}`}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-2xl">Quem entraria</h2>
        <ul className="space-y-1.5 max-h-[28rem] overflow-auto pr-1">
          {(() => {
            let seatNum = 0
            const people = sim.called.map((s) => {
              const isGhost = s.occupiesSeat === false
              const remapped = Boolean(s.fromVacantQuota)
              const cotistaNota = isCotistaNaAmplaPorNota(s)
              if (!isGhost) seatNum += 1
              const pathNote = remapped
                ? amplaPorFaltaPhrase(s.fromVacantQuota!)
                : cotistaNota
                  ? 'cotista na ampla pela nota'
                  : s.list
              return (
                <CandidateQueueRow
                  key={`${s.candidate.pedido}-${s.list}-${isGhost ? 'sj' : 'seat'}`}
                  candidate={s.candidate}
                  prefix={isGhost ? '·' : `${seatNum}.`}
                  note={pathNote}
                  highlighted={focusPedido === String(s.candidate.pedido)}
                  remapped={remapped}
                  showSegment={false}
                />
              )
            })
            const vacantRows = (
              [
                ['Ampla', sim.vacancies.ampla],
                ['Negro', sim.vacancies.negro],
                ['PcD', sim.vacancies.pcd],
              ] as const
            )
              .filter(([, count]) => count > 0)
              .map(([list, count]) => (
                <li key={`vacant-${list}`}>
                  <div className="flex items-start justify-between gap-2 rounded-lg border border-dashed border-warn/50 bg-warn/5 px-3 py-2.5 text-sm text-left">
                    <span className="text-[#1a2332]">
                      <span className="text-ink-soft mr-2">○</span>
                      {count === 1 ? 'Vaga ociosa' : `${fmtInt(count)} vagas ociosas`}
                      <span className="text-ink-soft">
                        {' '}
                        · {list} · sem candidato restante (ociosa de verdade)
                      </span>
                    </span>
                    <span className="text-xs font-medium text-warn">ociosa</span>
                  </div>
                </li>
              ))
            return [...people, ...vacantRows]
          })()}
        </ul>
      </section>
    </div>
  )
}

function SplitCard({
  label,
  value,
  vacant,
  remapped = 0,
}: {
  label: string
  value: number
  vacant: number
  remapped?: number
}) {
  return (
    <div
      className={`rounded-xl border px-1.5 py-2.5 sm:px-2 sm:py-3 min-w-0 ${
        vacant > 0
          ? 'border-warn/40 bg-warn/5'
          : remapped > 0
            ? 'border-sea/40 bg-sea/5'
            : 'border-line bg-paper'
      }`}
    >
      <p className="text-[11px] text-ink-soft uppercase tracking-wide">{label}</p>
      <p className="font-display text-2xl">{value}</p>
      {remapped > 0 && (
        <p className="text-[11px] text-sea">
          {remapped === 1
            ? '1 vaga foi movida para a ampla'
            : `${remapped} vagas foram movidas para a ampla`}
        </p>
      )}
      {vacant > 0 && (
        <p className="text-[11px] text-warn">
          {vacant} ociosa{vacant === 1 ? '' : 's'}
        </p>
      )}
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
