import {
  type ToolHandler,
  useAgnoChat,
  useAgnoToolExecution,
} from "@antipopp/agno-react";
import type { ChatStatus, FileUIPart } from "ai";
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
import { ChatInput, type ChatInputMessage } from "./ChatInput";
import { MessageItem } from "./MessageItem";
import { StreamingIndicator } from "./StreamingIndicator";

function getAttachmentPrompt(fileCount: number): string {
  if (fileCount === 1) {
    return "Please analyze the attached file.";
  }

  return "Please analyze the attached files.";
}

function getExtensionFromMimeType(mediaType?: string): string {
  if (!mediaType?.includes("/")) {
    return "";
  }

  const subtype = mediaType.split("/")[1]?.split(";")[0]?.trim().toLowerCase();

  if (!subtype) {
    return "";
  }

  if (subtype === "jpeg") {
    return ".jpg";
  }

  return `.${subtype}`;
}

async function filePartToFile(
  filePart: FileUIPart,
  index: number
): Promise<File | null> {
  if (!filePart.url) {
    return null;
  }

  try {
    const response = await fetch(filePart.url);
    const blob = await response.blob();
    const type = filePart.mediaType || blob.type || "application/octet-stream";
    const fallbackName = `attachment-${index + 1}${getExtensionFromMimeType(type)}`;
    const filename = filePart.filename?.trim() || fallbackName;

    return new File([blob], filename, { type });
  } catch {
    return null;
  }
}

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
  const toolHandlers = {
    // Example: show alert (legacy tool)
    show_alert: (args: { content?: unknown }) => {
      const content =
        typeof args.content === "string"
          ? args.content
          : String(args.content ?? "");

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
  } satisfies Record<string, ToolHandler>;

  // Use tool execution hook with auto-execution enabled
  const { isPaused, isExecuting, pendingTools, executionError } =
    useAgnoToolExecution(toolHandlers, true);

  const handleSend = async (message: ChatInputMessage) => {
    const files = message.files ?? [];
    const preparedFiles = (
      await Promise.all(files.map((file, index) => filePartToFile(file, index)))
    ).filter((file): file is File => file !== null);

    if (files.length > 0 && preparedFiles.length === 0) {
      toast.error("Failed to prepare attachments for upload");
      return;
    }

    if (preparedFiles.length > 0 && preparedFiles.length < files.length) {
      toast.error("Some attachments could not be uploaded");
    }

    const text = message.text?.trim();
    const finalMessage = text || getAttachmentPrompt(preparedFiles.length);

    try {
      await sendMessage(
        finalMessage,
        preparedFiles.length > 0 ? { files: preparedFiles } : undefined
      );
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
            messages.map((message) => (
              <MessageItem
                key={`${message.created_at}-${message.role}-${message.content.slice(0, 32)}`}
                message={message}
              />
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
          placeholder="Type your message or attach files..."
          status={chatStatus}
        />
      </div>
    </div>
  );
}
