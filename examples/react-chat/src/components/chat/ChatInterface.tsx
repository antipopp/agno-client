import {
  type ToolHandler,
  useAgnoChat,
  useAgnoToolExecution,
} from "@antipopp/agno-react";
import type { ChatStatus } from "ai";
import { Loader2, MessageSquare, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { EXAMPLE_GENERATIVE_TOOLS } from "@/tools/exampleGenerativeTools";
import { ChatInput } from "./ChatInput";
import { MessageItem } from "./MessageItem";
import { StreamingIndicator } from "./StreamingIndicator";

export function ChatInterface() {
  const {
    messages,
    sendMessage,
    cancelRun,
    isCancelling,
    isRefreshing,
    isStreaming,
    error,
  } = useAgnoChat();

  const [chatStatus, setChatStatus] = useState<ChatStatus>("ready");

  // Combine example generative tools with other tool handlers
  const toolHandlers: Record<string, ToolHandler> = {
    // Example: show alert (legacy tool)
    show_alert: async (args: Record<string, any>) => {
      const content = args.content as string;

      // Also show as toast notification
      toast.info("Alert from Agent", {
        description: content,
      });

      return {
        success: true,
        message: "Alert displayed successfully",
        content,
      };
    },

    // Add all generative UI example tools
    ...EXAMPLE_GENERATIVE_TOOLS,
  };

  // Use tool execution hook with auto-execution enabled
  const { isPaused, isExecuting, pendingTools, executionError } =
    useAgnoToolExecution(toolHandlers, true);

  const handleSend = async (message: string) => {
    try {
      await sendMessage(message);
    } catch (err) {
      toast.error(`Failed to send message: ${error || err}`);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelRun();
    } catch (err) {
      toast.error(`Failed to cancel run: ${error || err}`);
    }
  };

  useEffect(() => {
    if (isStreaming && !error) {
      setChatStatus("streaming");
      return;
    }

    if (error) {
      setChatStatus("error");
      return;
    }

    setChatStatus("ready");
  }, [error, isStreaming]);

  return (
    <div className="flex h-full flex-col">
      <Conversation className="relative w-full" style={{ height: "500px" }}>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Start a conversation to see messages here"
              icon={<MessageSquare className="size-12" />}
              title="No messages yet"
            />
          ) : (
            messages.map((message, index) => (
              <MessageItem key={index} message={message} />
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {(isPaused || isExecuting) && (
        <div className="border-border border-t bg-accent/50 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Executing {pendingTools.length} tool
                  {pendingTools.length !== 1 ? "s" : ""}...
                </span>
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                <span>
                  Preparing to execute {pendingTools.length} tool
                  {pendingTools.length !== 1 ? "s" : ""}...
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {isStreaming && (
        <div className="border-border border-t px-4 py-2">
          <StreamingIndicator />
        </div>
      )}

      {(error || executionError) && (
        <div className="border-destructive border-t bg-destructive/10 px-4 py-2 text-destructive text-sm">
          {error || executionError}
        </div>
      )}

      <div className="border-border border-t bg-background px-4 py-3">
        <ChatInput
          disabled={isCancelling || isRefreshing}
          onCancel={handleCancel}
          onSend={handleSend}
          placeholder="Type your message..."
          status={chatStatus}
        />
      </div>
    </div>
  );
}
