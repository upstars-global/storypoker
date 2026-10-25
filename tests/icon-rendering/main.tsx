import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CatalogHarness from './CatalogHarness'
import '~/assets/css/main.css'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <CatalogHarness />
  </StrictMode>,
)
