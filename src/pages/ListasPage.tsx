import { useMemo, useState } from 'react'
import { CandidateQueueRow } from '../components/CandidateQueueRow'
import { useData } from '../lib/data'
import { fmtInt } from '../lib/explain'
import { remainingQueuePeople, type SegmentFilter } from '../lib/queueList'
import { remainingUniverse } from '../lib/simulate'

const SEGMENTS: SegmentFilter[] = ['Ampla', 'Negro', 'PcD']

export function ListasPage() {
  const { candidates, loading } = useData()
  const [segments, setSegments] = useState<SegmentFilter[]>([...SEGMENTS])
  const [includeSubJudice, setIncludeSubJudice] = useState(true)

  const people = useMemo(
    () => remainingQueuePeople(candidates, { segments, includeSubJudice }),
    [candidates, segments, includeSubJudice],
  )
  const universe = remainingUniverse(candidates)

  const toggleSegment = (s: SegmentFilter) => {
    setSegments((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    )
  }

  if (loading) return <p className="text-ink-soft">Carregando...</p>

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl">Listas</h1>
        <p className="text-ink-soft max-w-2xl text-sm md:text-base">
          Quem ainda espera na fila da T2. Filtra por segmento: Negro e PcD aparece
          se Negro ou PcD estiver marcado. Gestante e fim de fila entram sempre
          (ocupam vaga). Sub judice você liga ou desliga; não ocupam assento.
        </p>
      </header>

      <section className="rounded-2xl border-2 border-sea/40 bg-paper-2 p-4 md:p-5 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Segmento
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            {SEGMENTS.map((s) => (
              <FilterTag
                key={s}
                label={s}
                checked={segments.includes(s)}
                onToggle={() => toggleSegment(s)}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-soft">
            Nenhum marcado mostra todo mundo. As duas cotas ao mesmo tempo
            incluem quem é Negro e PcD.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Situação
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <FilterTag
              label="Sub judice"
              checked={includeSubJudice}
              onToggle={() => setIncludeSubJudice((v) => !v)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-2xl">Quem espera</h2>
        <p className="text-xs text-ink-soft">
          {fmtInt(people.length)} nesta vista · {fmtInt(universe.remainingPaper)}{' '}
          no papel · {fmtInt(universe.remainingOccupying)} ocupam vaga
        </p>
        {people.length === 0 ? (
          <div className="rounded-xl border border-line bg-paper-2 p-4 text-sm">
            <p className="font-medium">Ninguém nessa combinação.</p>
            <p className="text-ink-soft mt-1">
              Marca outro segmento ou liga sub judice.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[min(40rem,70dvh)] overflow-auto pr-1">
            {people.map((c, i) => (
              <CandidateQueueRow
                key={c.pedido}
                candidate={c}
                prefix={`${i + 1}.`}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function FilterTag({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={`text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
        checked
          ? 'bg-sea text-white border-sea'
          : 'bg-paper border-line text-ink-soft hover:border-sea/40'
      }`}
    >
      {label}
    </button>
  )
}
