import { useAgnoChat, useAgnoSession } from "@antipopp/agno-react";
import { Loader2, MessageSquarePlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function SessionSidebar() {
  const { sessions, currentSessionId, loadSession, fetchSessions, isLoading } =
    useAgnoSession();
  const { clearMessages } = useAgnoChat();

  const handleFetchSessions = async () => {
    try {
      await fetchSessions();
      toast.success("Sessions refreshed");
    } catch (_err) {
      toast.error("Failed to fetch sessions");
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
      toast.success("Session loaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load session");
    }
  };

  const handleNewChat = () => {
    clearMessages();
    toast.success("Started new chat");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="space-y-2 p-4">
        <h2 className="font-semibold text-lg">Sessions</h2>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleNewChat}
            size="sm"
            variant="default"
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
          <Button
            disabled={isLoading}
            onClick={handleFetchSessions}
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
        <div className="space-y-2 p-4">
          {sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No sessions found
              <p className="mt-2 text-xs">Click refresh to load sessions</p>
            </div>
          ) : (
            sessions.map((session) => (
              <Card
                className={`cursor-pointer p-3 transition-colors hover:bg-accent ${
                  currentSessionId === session.session_id
                    ? "border-primary bg-accent"
                    : ""
                }`}
                key={session.session_id}
                onClick={() => handleLoadSession(session.session_id)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 truncate font-medium text-sm">
                      {session.session_name || session.session_id}
                    </div>
                    {currentSessionId === session.session_id && (
                      <Badge className="text-xs" variant="default">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-muted-foreground text-xs">
                    <div>
                      Created:{" "}
                      {session.created_at &&
                        new Date(session.created_at).toLocaleDateString()}
                    </div>
                    {session.updated_at && (
                      <div>
                        Updated:{" "}
                        {new Date(session.updated_at).toLocaleDateString()}
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
  );
}
