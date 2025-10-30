import { useAgnoClient, useAgnoChat } from '@antipopp/agno-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { Copy, Activity } from 'lucide-react'
import { toast } from 'sonner'

interface EventLog {
  timestamp: number
  event: string
  data?: any
}

export function StateInspector() {
  const client = useAgnoClient()
  const { messages, isStreaming, error } = useAgnoChat()
  const [eventLog, setEventLog] = useState<EventLog[]>([])

  // Listen to all events and log them
  useEffect(() => {
    const events = [
      'message:update',
      'message:complete',
      'message:error',
      'session:loaded',
      'session:created',
      'stream:start',
      'stream:end',
      'state:change',
      'config:change',
    ]

    const handlers = events.map((eventName) => {
      const handler = (data?: any) => {
        setEventLog((prev) => [
          {
            timestamp: Date.now(),
            event: eventName,
            data: data ? JSON.stringify(data, null, 2) : undefined,
          },
          ...prev.slice(0, 49), // Keep last 50 events
        ])
      }
      client.on(eventName, handler)
      return { eventName, handler }
    })

    return () => {
      handlers.forEach(({ eventName, handler }) => {
        client.off(eventName, handler)
      })
    }
  }, [client])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const config = client.getConfig()
  const clientState = client.getState()

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Debug Inspector
          </CardTitle>
          <CardDescription>Real-time state and event monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="state" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="state" className="flex-1">
                State
              </TabsTrigger>
              <TabsTrigger value="config" className="flex-1">
                Config
              </TabsTrigger>
              <TabsTrigger value="events" className="flex-1">
                Events
              </TabsTrigger>
            </TabsList>

            {/* State Tab */}
            <TabsContent value="state" className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Streaming</span>
                  <Badge variant={isStreaming ? 'default' : 'secondary'}>
                    {isStreaming ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Endpoint Active</span>
                  <Badge variant={clientState.isEndpointActive ? 'default' : 'destructive'}>
                    {clientState.isEndpointActive ? 'Yes' : 'No'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Messages</span>
                  <Badge variant="outline">{messages.length}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sessions</span>
                  <Badge variant="outline">{clientState.sessions.length}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Agents</span>
                  <Badge variant="outline">{clientState.agents.length}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Teams</span>
                  <Badge variant="outline">{clientState.teams.length}</Badge>
                </div>

                {error && (
                  <div className="p-2 bg-destructive/10 text-destructive text-xs rounded">
                    {error}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Full State</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(clientState, null, 2))}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <ScrollArea className="h-[200px]">
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(clientState, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Config Tab */}
            <TabsContent value="config" className="space-y-3">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Endpoint:</span>
                  <div className="text-muted-foreground break-all">{config.endpoint}</div>
                </div>
                <div>
                  <span className="font-medium">Mode:</span>
                  <Badge variant="outline" className="ml-2">
                    {config.mode || 'Not set'}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Agent ID:</span>
                  <div className="text-muted-foreground break-all">
                    {config.agentId || 'Not set'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Team ID:</span>
                  <div className="text-muted-foreground break-all">
                    {config.teamId || 'Not set'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Database ID:</span>
                  <div className="text-muted-foreground break-all">
                    {config.dbId || 'Not set'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Session ID:</span>
                  <div className="text-muted-foreground break-all">
                    {config.sessionId || 'Not set'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Auth Token:</span>
                  <div className="text-muted-foreground">
                    {config.authToken ? '••••••••' : 'Not set'}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Full Config</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify({ ...config, authToken: config.authToken ? '***' : undefined }, null, 2)
                      )
                    }
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify({ ...config, authToken: config.authToken ? '***' : undefined }, null, 2)}
                </pre>
              </div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Event Log ({eventLog.length})</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEventLog([])}
                >
                  Clear
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {eventLog.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No events yet
                    </div>
                  ) : (
                    eventLog.map((log, idx) => (
                      <Card key={idx} className="p-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {log.event}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {log.data && (
                            <pre className="text-xs bg-muted p-1 rounded overflow-auto max-h-[100px]">
                              {log.data}
                            </pre>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
