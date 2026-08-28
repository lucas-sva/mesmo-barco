import { useMemo, useState } from 'react'
import { BrandMark } from '../components/BrandMark'
import { CandidateQueueRow } from '../components/CandidateQueueRow'
import { useData } from '../lib/data'
import { fmtInt } from '../lib/explain'
import { remainingQueuePeople, type SegmentFilter } from '../lib/queueList'
import { remainingUniverse } from '../lib/simulate'

const SEGMENT_CHOICES = ['Todos', 'Ampla', 'Negro', 'PcD'] as const
type SegmentChoice = (typeof SEGMENT_CHOICES)[number]

export function ListasPage() {
  const { candidates, loading } = useData()
  const [segment, setSegment] = useState<SegmentChoice>('Todos')
  const [includeSubJudice, setIncludeSubJudice] = useState(true)

  const segments: readonly SegmentFilter[] =
    segment === 'Todos' ? [] : [segment]

  const people = useMemo(
    () => remainingQueuePeople(candidates, { segments, includeSubJudice }),
    [candidates, segments, includeSubJudice],
  )
  const universe = remainingUniverse(candidates)

  if (loading) return <p className="text-ink-soft">Carregando...</p>

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center text-center space-y-3">
        <BrandMark />
        <h1 className="font-display text-3xl md:text-4xl">Listas</h1>
      </header>

      <section className="rounded-xl border border-line bg-paper-2 px-3 py-2.5 md:px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            role="radiogroup"
            aria-label="Segmento"
            className="flex min-w-0 flex-wrap gap-1 rounded-lg bg-ink/[0.06] p-0.5"
          >
            {SEGMENT_CHOICES.map((choice) => {
              const selected = segment === choice
              return (
                <label
                  key={choice}
                  className={`inline-flex min-h-9 cursor-pointer select-none items-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sea/50 sm:min-h-8 sm:px-3 sm:text-sm ${
                    selected
                      ? 'bg-sea text-white shadow-sm'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="listas-segmento"
                    value={choice}
                    checked={selected}
                    onChange={() => setSegment(choice)}
                    className="sr-only"
                  />
                  {choice}
                </label>
              )
            })}
          </div>
          <label className="inline-flex min-h-9 cursor-pointer select-none items-center gap-1.5 px-1 text-xs text-ink-soft hover:text-ink">
            <input
              type="checkbox"
              className="size-3.5 accent-sea"
              checked={includeSubJudice}
              onChange={(e) => setIncludeSubJudice(e.target.checked)}
            />
            Sub judice
          </label>
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
              Escolhe outro segmento ou liga sub judice.
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
