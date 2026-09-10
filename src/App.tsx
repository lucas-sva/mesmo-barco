import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { DataProvider } from './lib/data'

const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage })),
)
const CandidatePage = lazy(() =>
  import('./pages/CandidatePage').then((m) => ({ default: m.CandidatePage })),
)
const SimulatePage = lazy(() =>
  import('./pages/SimulatePage').then((m) => ({ default: m.SimulatePage })),
)
const ListasPage = lazy(() =>
  import('./pages/ListasPage').then((m) => ({ default: m.ListasPage })),
)
const HowPage = lazy(() =>
  import('./pages/HowPage').then((m) => ({ default: m.HowPage })),
)

function RouteFallback() {
  return <p className="text-ink-soft">Carregando...</p>
}

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Shell>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/candidato/:pedido" element={<CandidatePage />} />
              <Route path="/simular" element={<SimulatePage />} />
              <Route path="/listas" element={<ListasPage />} />
              <Route path="/como-funciona" element={<HowPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Shell>
      </HashRouter>
    </DataProvider>
  )
}
