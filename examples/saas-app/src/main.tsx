import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AgnoProvider } from '@antipopp/agno-react'
import './styles/globals.css'
import App from './App.tsx'
import { GlobalToolHandlers } from './components/GlobalToolHandlers.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GlobalToolHandlers>
        <AgnoProvider
          config={{
            endpoint: 'http://localhost:7777',
            mode: 'agent',
            agentId: 'demo-saas-agent',
          }}
        >
          <App />
        </AgnoProvider>
      </GlobalToolHandlers>
    </BrowserRouter>
  </StrictMode>,
)
