# Mesmo Barco

App web grátis e auditável pra quem ficou na fila da 2ª turma do **OIPCE** (Oficial Investigador da PC/CE). Busca nome, explica a posição, mostra notas e simula T2 com a mesma lógica observada na T1.

Não é site oficial da PC/CE, CEV/UECE ou FUNECE. É ferramenta de colega.

## App online

https://lucas-sva.github.io/mesmo-barco/

Push em `main` roda testes + build e publica no GitHub Pages (Actions).

## Stack

Vite + React + TypeScript + Tailwind. Deploy no GitHub Pages (R$ 0).

## Dados

| Origem | Uso |
|--------|-----|
| Comunicado 166/2026-CEV/UECE | Notas por disciplina, objetiva, discursiva, TAF, etc. |
| Edital 17 – PC/CE | Classificação definitiva e Situação (T1 / CR) |
| Chamada complementar | Marca quem já foi puxado na reposição |

Parser: `scripts/parse_candidates.py` → `data/*.json` (copiado pra `public/data/`).

Testes:

```bash
npm run test:data
npm test
```

## Dev

```bash
python3 -m venv .venv && .venv/bin/pip install pypdf
.venv/bin/python scripts/parse_candidates.py
cp data/*.json public/data/
npm install
npm run dev
```

## Deploy (CI/CD)

Workflow: `.github/workflows/deploy-pages.yml`

1. Testes (Python + Vitest)
2. `npm run build`
3. Publish artifact → GitHub Pages

Em **Settings → Pages → Build and deployment**, source deve ser **GitHub Actions**.
