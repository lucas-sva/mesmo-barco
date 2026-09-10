import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureFreshDeploy } from './lib/ensureFreshDeploy'

void ensureFreshDeploy().then((shouldStart) => {
  if (!shouldStart) return
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

