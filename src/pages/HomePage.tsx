import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { useData } from '../lib/data'
import { fmtNum } from '../lib/explain'

export function HomePage() {
  const { loading, error, search, meta } = useData()
  const [q, setQ] = useState('')
  const results = useMemo(() => search(q, 25), [search, q])

  return (
    <div className="space-y-8">
      <section className="space-y-4 pt-2 md:pt-6 flex flex-col items-center text-center">
        <BrandMark />
        <p className="text-sm font-medium text-sea uppercase tracking-[0.14em]">
          OIPCE · fila da 2ª turma
        </p>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight max-w-3xl">
          Acha seu nome na fila.
        </h1>
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
        {meta && (
          <p className="text-xs text-ink-soft w-full max-w-2xl">
            {Number(meta.stats.remaining).toLocaleString('pt-BR')} na fila do papel ·{' '}
            {Number(meta.stats.t1_total).toLocaleString('pt-BR')} na T1 (imediatas+CR) ·{' '}
            {Number(meta.stats.complementar_matched)} na complementar
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

      <ul className="space-y-2">
        {results.map((c) => (
          <li key={c.pedido}>
            <Link
              to={`/candidato/${c.pedido}`}
              className="block rounded-xl border border-line bg-white/90 px-4 py-3 hover:border-sea/50 hover:bg-white transition"
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
