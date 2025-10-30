import { useAgnoSession, useAgnoChat } from '@antipopp/agno-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { RefreshCw, MessageSquarePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function SessionSidebar() {
  const { sessions, currentSessionId, loadSession, fetchSessions, isLoading } = useAgnoSession()
  const { clearMessages } = useAgnoChat()

  const handleFetchSessions = async () => {
    try {
      await fetchSessions()
      toast.success('Sessions refreshed')
    } catch (err) {
      toast.error('Failed to fetch sessions')
    }
  }

  const handleLoadSession = async (sessionId: string) => {
    try {
      await loadSession(sessionId)
      toast.success('Session loaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to load session')
    }
  }

  const handleNewChat = () => {
    clearMessages()
    toast.success('Started new chat')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 space-y-2">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleNewChat}
            className="flex-1"
            size="sm"
            variant="default"
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          <Button
            onClick={handleFetchSessions}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No sessions found
              <p className="text-xs mt-2">Click refresh to load sessions</p>
            </div>
          ) : (
            sessions.map((session) => (
              <Card
                key={session.session_id}
                className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                  currentSessionId === session.session_id ? 'border-primary bg-accent' : ''
                }`}
                onClick={() => handleLoadSession(session.session_id)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm truncate flex-1">
                      {session.session_name || session.session_id}
                    </div>
                    {currentSessionId === session.session_id && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Created: {session.created_at && new Date(session.created_at).toLocaleDateString()}
                    </div>
                    {session.updated_at && (
                      <div>
                        Updated: {new Date(session.updated_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
