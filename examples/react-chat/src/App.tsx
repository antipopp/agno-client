import { AgnoProvider } from '@antipopp/agno-react'
import { AgnoClientConfig } from '@antipopp/agno-types'
import { Toaster } from '@/components/ui/sonner'
import { ConfigPanel } from '@/components/config/ConfigPanel'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { SessionSidebar } from '@/components/sessions/SessionSidebar'
import { StateInspector } from '@/components/debug/StateInspector'
import { useState } from 'react'
import { PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

/**
 * Validate mode from environment variable
 */
function validateMode(value: unknown): 'agent' | 'team' {
  if (value === 'agent' || value === 'team') {
    return value
  }
  if (value) {
    console.warn(`Invalid mode: ${value}, defaulting to 'agent'`)
  }
  return 'agent'
}

/**
 * Load initial config from environment variables (created once, outside component)
 */
const INITIAL_CONFIG: AgnoClientConfig = {
  endpoint: import.meta.env.VITE_AGNO_ENDPOINT || 'http://localhost:7777',
  authToken: import.meta.env.VITE_AGNO_AUTH_TOKEN || undefined,
  mode: validateMode(import.meta.env.VITE_AGNO_MODE),
  agentId: import.meta.env.VITE_AGNO_AGENT_ID || undefined,
  teamId: import.meta.env.VITE_AGNO_TEAM_ID || undefined,
  dbId: import.meta.env.VITE_AGNO_DB_ID || undefined,
}

function App() {

  const [showSessionSidebar, setShowSessionSidebar] = useState(true)
  const [showConfigPanel, setShowConfigPanel] = useState(false)

  return (
    <AgnoProvider config={INITIAL_CONFIG}>
      <div className="flex h-screen bg-background text-foreground">
        {/* Session Sidebar - Left */}
        {showSessionSidebar && (
          <>
            <div className="w-64 border-r border-border overflow-hidden flex flex-col">
              <SessionSidebar />
            </div>
            <Separator orientation="vertical" />
          </>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-14 border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSessionSidebar(!showSessionSidebar)}
                title={showSessionSidebar ? 'Hide Sessions' : 'Show Sessions'}
              >
                {showSessionSidebar ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
              <h1 className="text-lg font-semibold">Agno Chat</h1>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              title={showConfigPanel ? 'Hide Settings' : 'Show Settings'}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
        </div>

        {/* Config & Debug Panel - Right */}
        {showConfigPanel && (
          <>
            <Separator orientation="vertical" />
            <div className="w-96 border-l border-border overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto">
                <ConfigPanel />
                <Separator className="my-4" />
                <StateInspector />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast notifications */}
      <Toaster />
    </AgnoProvider>
  )
}

export default App
