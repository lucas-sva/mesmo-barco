# Mesmo Barco

App web grátis e auditável pra quem ficou na fila da 2ª turma do **OIPCE**
(Oficial Investigador da PC/CE). Busca nome, explica a posição, mostra notas e
simula T2 com a lógica observada na T1.

Não é site oficial da PC/CE, CEV/UECE ou FUNECE. É ferramenta de colega
(Lucas Galdino).

## App online

https://lucas-sva.github.io/mesmo-barco/

Push em `main` → Actions (testes + build) → GitHub Pages.

## Auditar

Quer conferir os números? Comece por **[docs/AUDITORIA.md](docs/AUDITORIA.md)**.

Resumo:

- Fontes em `raw/`
- Parser `scripts/parse_candidates.py` → `data/*.json` / `public/data/`
- Sub judice não ocupam vaga efetiva
- ~25 nomes **No curso (doc. ausente)**: já convocados pela lógica da fila; PDF intermediário ainda não está no repo
- Testes: `npm run test:data` e `npm test`

## Stack

Vite + React + TypeScript + Tailwind v4 + Fuse.js. Deploy GitHub Pages (R$ 0).

## Dados (visão rápida)

| Origem | Uso |
|--------|-----|
| Comunicado 166 | Notas + ranks |
| Edital 17 | Classificação definitiva / Situação |
| Chamada T1 inspeção/docs | ~750 (imediatas + CR) |
| Chamada complementar | Reposição por segmento |
| `overrides-already-called.json` | Confirmação comunitária com fonte |
| Fechamento de lacuna | Regular/Apto “pulados” antes de quem entrou na complementar |

## Dev

```bash
python3 -m venv .venv && .venv/bin/pip install pypdf
.venv/bin/python scripts/parse_candidates.py
cp data/*.json public/data/
npm install
npm run dev
```

## CI/CD

`.github/workflows/deploy-pages.yml`: unittest Python → Vitest → `npm run build` → Pages.
