import { Link } from 'react-router-dom'
import { Chip } from './Chip'
import { fmtNum } from '../lib/explain'
import { isSubJudice, queueStatusLabel, queueStatusOf } from '../lib/simulate'
import type { Candidate } from '../types/candidate'

export function CandidateQueueRow({
  candidate,
  prefix,
  note,
  highlighted = false,
  remapped = false,
  showSegment = true,
}: {
  candidate: Candidate
  prefix?: string
  note?: string
  highlighted?: boolean
  remapped?: boolean
  showSegment?: boolean
}) {
  const status = queueStatusOf(candidate)
  const ghost = isSubJudice(candidate)
  return (
    <li>
      <Link
        to={`/candidato/${candidate.pedido}`}
        className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm text-left ${
          highlighted
            ? 'border-sea bg-sea/10'
            : ghost
              ? 'border-dashed border-line bg-paper/60 opacity-90'
              : remapped
                ? 'border-sea/50 bg-sea/10 hover:border-sea'
                : 'border-line bg-paper-2/80 hover:border-sea/40'
        }`}
      >
        <span className="text-[#1a2332] min-w-0">
          <span className="block break-words">
            {prefix != null && (
              <span className="text-ink-soft mr-2">{prefix}</span>
            )}
            {candidate.name}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {showSegment && <Chip size="sm">{candidate.segment}</Chip>}
            {note && (
              <Chip size="sm" tone={remapped ? 'sea' : 'default'}>
                {note}
              </Chip>
            )}
            <Chip size="sm">geral #{candidate.rank_geral}</Chip>
            {candidate.rank_negro != null && (
              <Chip size="sm">Negro #{candidate.rank_negro}</Chip>
            )}
            {candidate.rank_pcd != null && (
              <Chip size="sm">PcD #{candidate.rank_pcd}</Chip>
            )}
            {ghost && (
              <Chip size="sm" tone="warn">
                Sub judice (não ocupa vaga)
              </Chip>
            )}
            {!ghost && status !== 'regular' && (
              <Chip size="sm">{queueStatusLabel(status)}</Chip>
            )}
          </span>
        </span>
        <span
          className={`font-display font-semibold shrink-0 tabular-nums ${
            remapped ? 'text-sea' : 'text-[#1a2332]'
          }`}
        >
          {fmtNum(candidate.scores.total)}
        </span>
      </Link>
    </li>
  )
}
