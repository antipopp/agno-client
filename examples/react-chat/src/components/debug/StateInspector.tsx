import { useAgnoChat, useAgnoClient } from "@antipopp/agno-react";
import { Activity, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EventLog {
  timestamp: number;
  event: string;
  data?: string;
}

export function StateInspector() {
  const client = useAgnoClient();
  const { messages, isStreaming, error } = useAgnoChat();
  const [eventLog, setEventLog] = useState<EventLog[]>([]);

  // Listen to all events and log them
  useEffect(() => {
    const events = [
      "message:update",
      "message:complete",
      "message:error",
      "session:loaded",
      "session:created",
      "stream:start",
      "stream:end",
      "state:change",
      "config:change",
    ];

    const handlers = events.map((eventName) => {
      const handler = (data?: unknown) => {
        setEventLog((prev) => [
          {
            timestamp: Date.now(),
            event: eventName,
            data: data ? JSON.stringify(data, null, 2) : undefined,
          },
          ...prev.slice(0, 49), // Keep last 50 events
        ]);
      };
      client.on(eventName, handler);
      return { eventName, handler };
    });

    return () => {
      for (const { eventName, handler } of handlers) {
        client.off(eventName, handler);
      }
    };
  }, [client]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const config = client.getConfig();
  const clientState = client.getState();

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Debug Inspector
          </CardTitle>
          <CardDescription>
            Real-time state and event monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs className="w-full" defaultValue="state">
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="state">
                State
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="config">
                Config
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="events">
                Events
              </TabsTrigger>
            </TabsList>

            {/* State Tab */}
            <TabsContent className="space-y-3" value="state">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Streaming</span>
                  <Badge variant={isStreaming ? "default" : "secondary"}>
                    {isStreaming ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Endpoint Active</span>
                  <Badge
                    variant={
                      clientState.isEndpointActive ? "default" : "destructive"
                    }
                  >
                    {clientState.isEndpointActive ? "Yes" : "No"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Messages</span>
                  <Badge variant="outline">{messages.length}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Sessions</span>
                  <Badge variant="outline">{clientState.sessions.length}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Agents</span>
                  <Badge variant="outline">{clientState.agents.length}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Teams</span>
                  <Badge variant="outline">{clientState.teams.length}</Badge>
                </div>

                {error && (
                  <div className="rounded bg-destructive/10 p-2 text-destructive text-xs">
                    {error}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-sm">Full State</span>
                  <Button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(clientState, null, 2))
                    }
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <ScrollArea className="h-[200px]">
                  <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(clientState, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Config Tab */}
            <TabsContent className="space-y-3" value="config">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Endpoint:</span>
                  <div className="break-all text-muted-foreground">
                    {config.endpoint}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Mode:</span>
                  <Badge className="ml-2" variant="outline">
                    {config.mode || "Not set"}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Agent ID:</span>
                  <div className="break-all text-muted-foreground">
                    {config.agentId || "Not set"}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Team ID:</span>
                  <div className="break-all text-muted-foreground">
                    {config.teamId || "Not set"}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Database ID:</span>
                  <div className="break-all text-muted-foreground">
                    {config.dbId || "Not set"}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Session ID:</span>
                  <div className="break-all text-muted-foreground">
                    {config.sessionId || "Not set"}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Auth Token:</span>
                  <div className="text-muted-foreground">
                    {config.authToken ? "••••••••" : "Not set"}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-sm">Full Config</span>
                  <Button
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(
                          {
                            ...config,
                            authToken: config.authToken ? "***" : undefined,
                          },
                          null,
                          2
                        )
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(
                    {
                      ...config,
                      authToken: config.authToken ? "***" : undefined,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent className="space-y-3" value="events">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  Event Log ({eventLog.length})
                </span>
                <Button
                  onClick={() => setEventLog([])}
                  size="sm"
                  variant="outline"
                >
                  Clear
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {eventLog.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      No events yet
                    </div>
                  ) : (
                    eventLog.map((log) => (
                      <Card
                        className="p-2"
                        key={`${log.timestamp}-${log.event}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge className="text-xs" variant="outline">
                              {log.event}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {log.data && (
                            <pre className="max-h-[100px] overflow-auto rounded bg-muted p-1 text-xs">
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
  );
}
