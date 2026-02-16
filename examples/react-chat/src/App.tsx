import { AgnoProvider } from "@antipopp/agno-react";
import type { AgnoClientConfig } from "@antipopp/agno-types";
import { PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ConfigPanel } from "@/components/config/ConfigPanel";
import { StateInspector } from "@/components/debug/StateInspector";
import { registerGenerativeUIComponents } from "@/components/generative-ui";
import { SessionSidebar } from "@/components/sessions/SessionSidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

/**
 * Validate mode from environment variable
 */
function validateMode(value: unknown): "agent" | "team" {
  if (value === "agent" || value === "team") {
    return value;
  }
  if (value) {
    console.warn(`Invalid mode: ${value}, defaulting to 'agent'`);
  }
  return "agent";
}

/**
 * Load initial config from environment variables (created once, outside component)
 */
const INITIAL_CONFIG: AgnoClientConfig = {
  endpoint: import.meta.env.VITE_AGNO_ENDPOINT || "http://localhost:7777",
  authToken: import.meta.env.VITE_AGNO_AUTH_TOKEN || undefined,
  mode: validateMode(import.meta.env.VITE_AGNO_MODE),
  agentId: import.meta.env.VITE_AGNO_AGENT_ID || undefined,
  teamId: import.meta.env.VITE_AGNO_TEAM_ID || undefined,
  dbId: import.meta.env.VITE_AGNO_DB_ID || undefined,
  dependencies: {
    user_name: "Test User",
  },
};

function App() {
  const [showSessionSidebar, setShowSessionSidebar] = useState(true);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Register generative UI components on mount
  useEffect(() => {
    registerGenerativeUIComponents();
  }, []);

  return (
    <AgnoProvider config={INITIAL_CONFIG}>
      <div className="flex h-screen bg-background text-foreground">
        {/* Session Sidebar - Left */}
        {showSessionSidebar && (
          <>
            <div className="flex w-64 flex-col overflow-hidden border-border border-r">
              <SessionSidebar />
            </div>
            <Separator orientation="vertical" />
          </>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-border border-b px-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowSessionSidebar(!showSessionSidebar)}
                size="icon"
                title={showSessionSidebar ? "Hide Sessions" : "Show Sessions"}
                variant="ghost"
              >
                {showSessionSidebar ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
              <h1 className="font-semibold text-lg">Agno Chat</h1>
            </div>

            <Button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              size="icon"
              title={showConfigPanel ? "Hide Settings" : "Show Settings"}
              variant="ghost"
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
            <div className="flex w-96 flex-col overflow-hidden border-border border-l">
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
  );
}

export default App;
