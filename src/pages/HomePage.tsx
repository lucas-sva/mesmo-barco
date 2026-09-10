import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { useData } from '../lib/data'
import { fmtInt, fmtNum } from '../lib/explain'
import { isSubJudice } from '../lib/simulate'

export function HomePage() {
  const { loading, error, search, candidates } = useData()
  const [q, setQ] = useState('')
  const results = useMemo(() => search(q, 25), [search, q])
  // Buscar footer: convocados = already in (T1/complementar/gaps);
  // regular/sub judice = remaining T2 paper queue only (not the whole concurso).
  const queueCounts = useMemo(() => {
    let convocados = 0
    let regular = 0
    let subJudice = 0
    for (const c of candidates) {
      if (c.already_called) {
        convocados += 1
        continue
      }
      if (!c.in_remaining_queue) continue
      if (isSubJudice(c)) subJudice += 1
      else regular += 1
    }
    return { convocados, regular, subJudice }
  }, [candidates])

  return (
    <div className="space-y-8">
      <section className="flex flex-col items-center text-center space-y-3">
        <BrandMark />
        <p className="text-sm font-medium text-sea uppercase tracking-[0.14em]">
          OIPCE · fila da 2ª turma
        </p>
        <p className="text-ink-soft max-w-2xl text-base">
          Projeção com a lista oficial (Edital 17) e as notas do Comunicado 166.
        </p>
      </section>

      <section className="space-y-3 flex flex-col items-center text-center">
        <label className="block text-sm font-medium w-full max-w-2xl" htmlFor="q">
          Nome ou nº de inscrição (pedido)
        </label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex.: Lucas Galdino ou 19316"
          autoComplete="off"
          spellCheck={false}
          className="w-full max-w-2xl rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink shadow-sm outline-none placeholder:text-ink-soft/70 focus:border-sea focus:ring-2 focus:ring-sea/20"
        />
        {!loading && candidates.length > 0 && (
          <p className="text-xs text-ink-soft w-full max-w-2xl">
            {fmtInt(queueCounts.convocados)} convocados ·{' '}
            {fmtInt(queueCounts.regular)} aprovados (regular) ·{' '}
            {fmtInt(queueCounts.subJudice)} aprovados (sub judice)
          </p>
        )}
      </section>

      {loading && <p className="text-ink-soft text-center">Carregando a lista...</p>}
      {error && <p className="text-warn">{error}</p>}

      {!loading && q.trim() && results.length === 0 && (
        <div className="rounded-xl border border-line bg-paper-2 p-4 text-sm">
          <p className="font-medium">Nada encontrado.</p>
          <p className="text-ink-soft mt-1">
            Tenta outro pedaço do nome ou o número do pedido.
          </p>
        </div>
      )}

      <ul className="space-y-1">
        {results.map((c) => (
          <li key={c.pedido}>
            <Link
              to={`/candidato/${c.pedido}`}
              className="block rounded-xl border border-line bg-white/90 px-4 py-1.5 hover:border-sea/50 hover:bg-white transition"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Pedido {c.pedido} · {c.segment} · {c.sex === 'F' ? 'F' : 'M'}
                    {c.already_called
                      ? c.called_t1
                        ? c.called_t1_cr
                          ? ' · T1 (CR)'
                          : ` · T1 (${c.classified_as ?? 'imediata'})`
                        : c.called_complementar
                          ? ' · complementar'
                          : c.called_inferred_gap
                            ? ' · no curso (doc. ausente)'
                            : ' · curso (override)'
                      : ' · na fila'}
                    {c.queue_status === 'gestante_fim_fila'
                      ? ' · gestante/fim de fila'
                      : c.queue_status === 'gestante'
                        ? ' · gestante'
                        : c.queue_status === 'sub_judice'
                        ? ' · sub judice'
                        : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{fmtNum(c.scores.total)}</p>
                  <p className="text-xs text-ink-soft">geral #{c.rank_geral}</p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
