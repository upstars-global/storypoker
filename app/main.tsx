import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import { initSupabase } from './lib/supabase-instance'
import { initAppUpdate } from './pwa'
import '~/assets/css/main.css'

initSupabase()

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

initAppUpdate()
