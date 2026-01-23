import { useAgnoChat, useAgnoToolExecution } from "@antipopp/agno-react";
import { Bot, Loader2 } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatInput } from "./ChatInput";
import { MessageItem } from "./MessageItem";

export function AICopilot() {
  const { messages, sendMessage, isStreaming, error } = useAgnoChat();

  // Set up tool execution with global handlers (from ToolHandlerProvider)
  // This enables the event listener for run:paused events
  const { isPaused, isExecuting, pendingTools } = useAgnoToolExecution();

  const handleSend = async (message: string) => {
    try {
      await sendMessage(message);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Report Assistant</h3>
        </div>
        <p className="mt-1 text-muted-foreground text-xs">
          Ask me anything about your reports and analytics
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                description="Start a conversation to get assistance with your reports"
                icon={<Bot className="h-12 w-12 text-muted-foreground" />}
                title="Ready to help"
              />
            ) : (
              <div className="space-y-1">
                {messages.map((message, index) => (
                  <MessageItem key={index} message={message} />
                ))}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Streaming/Execution Indicator */}
      {(isStreaming || isExecuting || isPaused) && (
        <div className="border-border border-t bg-accent/50 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {isExecuting
                ? "Executing tools..."
                : isPaused
                  ? `Processing ${pendingTools.length} tool(s)...`
                  : "AI is thinking..."}
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="border-destructive border-t bg-destructive/10 px-4 py-2 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-border border-t bg-background px-4 py-3">
        <ChatInput
          disabled={isStreaming}
          onSend={handleSend}
          placeholder="Ask about your reports..."
        />
      </div>
    </div>
  );
}
