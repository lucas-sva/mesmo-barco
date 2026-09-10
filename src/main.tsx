import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureFreshDeploy } from './lib/ensureFreshDeploy'

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Do not block first paint on version.json — check in parallel; reload only if stale.
void ensureFreshDeploy()
