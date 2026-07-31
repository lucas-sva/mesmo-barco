# Auditoria do Mesmo Barco

Guia pra quem quer conferir se o app está mentindo. Tudo aqui é reproduzível
com os arquivos do repositório. Não é site oficial da PC/CE, CEV/UECE ou FUNECE.

**App:** https://lucas-sva.github.io/mesmo-barco/  
**Código:** https://github.com/lucas-sva/mesmo-barco

## O que o app afirma

1. Usa só dados públicos (editais, comunicados, chamadas).
2. A fila da T2 desconta quem já saiu (T1 inspeção/docs, complementar, overrides e fechamento de lacuna documental).
3. Posição efetiva **não conta sub judice** como ocupante de vaga.
4. Simular N vagas preenche N assentos reais (sub judice podem aparecer na lista sem consumir número).
5. Onde falta PDF intermediário, o marcador é explícito: **No curso (doc. ausente)**.

## Fontes em `raw/`

| Arquivo | Papel |
|---------|--------|
| `comunicado-166-oipce.md` (+ pdf) | Notas por disciplina, objetiva, discursiva, TAF, ranks |
| `chamada-T1-DOE-OIPCE.md` | Edital 17: classificação definitiva + Situação |
| `chamada-T1-OIPCE.md` | Chamada inspeção/docs T1 (~750: Ampla/Negro/PcD) |
| `chamada-complementar-OIPCE.md` | Reposição por segmento |
| `edital-OIPCE.md` / `edital-alt-OIPCE.md` | Abertura + vagas (500 + 250 CR) |
| `edital-16-OIPCE.md` | CR ampliado |
| `lei-19706.md` | Cargos |
| `overrides-already-called.json` | Nomes no curso confirmados sem PDF ainda (ex.: Beatriz) |

O parser lê os `.md` (texto extraído). PDFs ficam pra auditoria humana.

## Pipeline de dados

```text
raw/*.md  -->  scripts/parse_candidates.py  -->  data/*.json
                                           \->  public/data/*.json  (cópia pro Vite)
```

Comandos:

```bash
python3 -m venv .venv && .venv/bin/pip install pypdf
.venv/bin/python scripts/parse_candidates.py
cp data/*.json public/data/
npm run test:data   # regressões dos limites T1 + lacunas
npm test            # dados + vitest do simulador
```

Saídas principais:

- `data/candidates.json` — um registro por pedido
- `data/meta.json` — regras citadas, estatísticas, lacunas, limites T1
- `data/t1_call_raw.json` / `complementar_raw.json` — linhas parseadas das chamadas

## Como um candidato é marcado “já saiu”

Ordem no parser:

1. **T1 inspeção/docs** (`chamada-T1-OIPCE.md`) → `called_t1` + `t1_call_meta`
2. **Edital 17 Classificado** → `called_t1_imediata` (garante as 500)
3. **Complementar** → `called_complementar`
4. **Fechamento de lacuna** → `called_inferred_gap` (rótulo UI: *No curso (doc. ausente)*)
5. **Override manual** → `called_override` (`raw/overrides-already-called.json`)

`already_called = qualquer um dos acima`  
`in_remaining_queue = not already_called`

### Fechamento de lacuna (os ~25)

Fato: na complementar Negro, a lista começa em classificação **#216** enquanto a T1 Negro terminou em **#195**. Quem está em **#196–#215** (ex.: 98,25 pontos) tem nota **melhor** que quem entrou com 97,75/97,50. Classificação pior não passa na frente na mesma fila.

Conclusão operacional: esses nomes **já foram convocados**; o PDF intermediário ainda não está no repo.

O app marca Regular/Apto com classificação `<= R` (R = última classificação da complementar daquele segmento) que não estavam nas listas oficiais. **Não marca** sub judice nem gestante.

Contagens atuais (ver `meta.json` → `gap_inference.by_segment`):

- Ampla / Negro / PcD (somatório ~25)

Campo técnico no JSON: `called_inferred_gap: true`  
Texto humano: `gap_inference_meta.label` / `caveat`

## Sub judice e gestante

- **Sub judice:** aparecem na ordem da nota; **não ocupam vaga** nem número efetivo. No simulador, filtro só controla visibilidade.
- **Gestante:** tratadas como adiamento operacional (padrão visto na T1 Ampla). Continuam na fila do papel até haver doc em contrário; não entram no fechamento de lacuna.

## Simulador T2

Arquivo: `src/lib/simulate.ts`

1. Reparte N como T1 (~75% ampla / 20% negro / 5% PcD)
2. Ampla: próximos por `rank_geral` entre quem `occupiesSeat`
3. Negro / PcD: por `rank_negro` / `rank_pcd`
4. Sub judice nunca consomem assento

Posição na ficha (`positionInRemaining`) usa a mesma regra de assento.

## Como auditar em 15 minutos

1. Clone o repo e rode `npm run test:data` (tem que passar).
2. Abra `data/meta.json`:
   - `stats.t1_call_list_parsed` = 750
   - `t1_boundaries.last_from_call_meta` (últimos Ampla/Negro/PcD da T1)
   - `gap_inference` (lista dos ~25 e a premissa)
3. Confira um caso Negro:
   - Wellyngton (último T1 Negro) ≈ `rank_negro` 195
   - Felipe José (1º complementar Negro) = classificação 216
   - Paulo Bruno (`rank_negro` 196) deve ter `called_inferred_gap: true`
4. Confira Lucas Galdino (pedido `19316`):
   - `in_remaining_queue: true`
   - posição efetiva = fila sem sub judice à frente
5. Diff: qualquer mudança em `scripts/parse_candidates.py` ou `src/lib/simulate.ts` deve vir com teste em `scripts/tests/` ou `src/lib/*.test.ts`.

## Limitações honestas

- Sem lista pública de desistentes/inaptos reais após a chamada.
- Sem PDF completo de nomeação/matrícula de toda a turma (por isso override + doc. ausente).
- Projeção ≠ promessa de nomeação.
- Homônimos: match de chamada prioriza classificação + segmento, não só nome.

## Contato / correção

Achou documento que fecha uma lacuna? Abra issue ou PR com o PDF/MD em `raw/` e, se for o caso, remova o nome de `gap_inference` na próxima parse (ele deixa de ser marcado quando passar a constar numa lista oficial).
