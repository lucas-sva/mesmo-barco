import { useMemo, useState } from 'react'
import { BrandMark } from '../components/BrandMark'
import { CandidateQueueRow } from '../components/CandidateQueueRow'
import { useData } from '../lib/data'
import { fmtInt } from '../lib/explain'
import {
  isNinjaCandidate,
  naoMarqueQueue,
  remainingQueuePeople,
  type SegmentFilter,
} from '../lib/queueList'
import { remainingUniverse } from '../lib/simulate'

const SEGMENT_CHOICES = ['Todos', 'Ampla', 'Negro', 'PcD'] as const
type SegmentChoice = (typeof SEGMENT_CHOICES)[number]

const NINJA_ROW_ID = 'ninja-row'

function jumpToNinja() {
  document
    .getElementById(NINJA_ROW_ID)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function ListasPage() {
  const { candidates, loading } = useData()
  const [segment, setSegment] = useState<SegmentChoice>('Todos')
  const [includeSubJudice, setIncludeSubJudice] = useState(true)
  // Feature parked, not shown — ninja/Ricardo builder, logo-cotas swap, jump-to-end stay for later.
  const naoMarque = false

  const segments: readonly SegmentFilter[] =
    segment === 'Todos' ? [] : [segment]

  const people = useMemo(
    () =>
      naoMarque
        ? naoMarqueQueue(candidates, { includeSubJudice })
        : remainingQueuePeople(candidates, { segments, includeSubJudice }),
    [candidates, segments, includeSubJudice, naoMarque],
  )
  const universe = remainingUniverse(candidates)
  const ninjaInView = naoMarque && people.some(isNinjaCandidate)

  if (loading) return <p className="text-ink-soft">Carregando...</p>

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center text-center space-y-3">
        {naoMarque ? (
          <BrandMark
            src="./logo-cotas.png"
            alt="Mãos erguidas em defesa das cotas"
          />
        ) : (
          <BrandMark />
        )}
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
        <h2 className="font-display text-2xl">
          {naoMarque ? 'Quem entra antes do Ninja' : 'Quem espera'}
        </h2>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-xs text-ink-soft">
            {fmtInt(people.length)} nesta vista · {fmtInt(universe.remainingPaper)}{' '}
            no papel · {fmtInt(universe.remainingOccupying)} ocupam vaga
          </p>
          {ninjaInView && (
            <button
              type="button"
              onClick={jumpToNinja}
              className="inline-flex min-h-8 shrink-0 items-center rounded-md border border-line bg-white px-2 py-1 text-[11px] font-medium text-ink-soft hover:border-sea/50 hover:text-ink"
            >
              encontrar o Ninja
            </button>
          )}
        </div>
        {people.length === 0 ? (
          <div className="rounded-xl border border-line bg-paper-2 p-4 text-sm">
            <p className="font-medium">Ninguém nessa combinação.</p>
            <p className="text-ink-soft mt-1">
              Escolhe outro segmento ou liga sub judice.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[min(40rem,70dvh)] overflow-auto pr-1">
            {people.map((c, i) => {
              const isNinja = isNinjaCandidate(c)
              return (
                <CandidateQueueRow
                  key={c.pedido}
                  candidate={c}
                  prefix={`${i + 1}.`}
                  id={isNinja && naoMarque ? NINJA_ROW_ID : undefined}
                  highlighted={isNinja && naoMarque}
                />
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
