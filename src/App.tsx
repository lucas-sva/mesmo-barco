import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { DataProvider } from './lib/data'
import { CandidatePage } from './pages/CandidatePage'
import { HomePage } from './pages/HomePage'
import { HowPage } from './pages/HowPage'
import { ListasPage } from './pages/ListasPage'
import { SimulatePage } from './pages/SimulatePage'

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/candidato/:pedido" element={<CandidatePage />} />
            <Route path="/simular" element={<SimulatePage />} />
            <Route path="/listas" element={<ListasPage />} />
            <Route path="/como-funciona" element={<HowPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </HashRouter>
    </DataProvider>
  )
}
