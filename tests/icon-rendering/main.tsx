import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import CatalogHarness from './CatalogHarness'
import RoomHarness from './RoomHarness'
import '~/i18n'
import '~/assets/css/main.css'

const view = new URLSearchParams(window.location.search).get('view') === 'catalog' ? 'catalog' : 'room'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <MemoryRouter>
      {view === 'catalog' ? <CatalogHarness /> : <RoomHarness />}
    </MemoryRouter>
  </StrictMode>,
)
