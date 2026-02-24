// ─── Buffer polyfill (required by isomorphic-git in browser) ─────────────────
import { Buffer } from 'buffer'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).Buffer = (globalThis as any).Buffer ?? Buffer

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/store'
import ThemeProvider from '@/components/layout/ThemeProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// ─── Service Worker registration ─────────────────────────────────────────────
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemeProvider>
    </Provider>
  </StrictMode>
)
