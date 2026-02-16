import type { ChatMessage } from "@antipopp/agno-types";
import { Bot, Paperclip, User } from "lucide-react";
import { Response } from "@/components/ai-elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div className="space-y-2 py-3">
      {/* Role Badge */}
      <div className="flex items-center gap-2">
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
        <Badge className="text-xs" variant={isUser ? "secondary" : "default"}>
          {isUser ? "You" : "AI Assistant"}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {new Date(message.created_at).toLocaleTimeString()}
        </span>
      </div>

      {/* Message Content */}
      {message.content && (
        <div className="prose prose-sm dark:prose-invert max-w-none pl-6">
          <Response>{message.content}</Response>
        </div>
      )}

      {/* Tool Calls */}
      {message.tool_calls && message.tool_calls.length > 0 && (
        <>
          <Separator className="my-2" />
          <div className="space-y-2 pl-6">
            {message.tool_calls.map((tool) => (
              <Tool
                defaultOpen={false}
                key={
                  tool.tool_call_id || `${tool.tool_name}-${tool.created_at}`
                }
              >
                <ToolHeader
                  state={
                    tool.tool_call_error ? "output-error" : "output-available"
                  }
                  title={tool.tool_name}
                  type="tool-use"
                />
                <ToolContent>
                  <ToolInput input={tool.tool_args} />
                  {tool.content && (
                    <ToolOutput
                      errorText={
                        tool.tool_call_error
                          ? "Tool execution failed"
                          : undefined
                      }
                      output={tool.content}
                    />
                  )}
                </ToolContent>
              </Tool>
            ))}
          </div>
        </>
      )}

      {/* Files */}
      {message.files && message.files.length > 0 && (
        <>
          <Separator className="my-2" />
          <div className="space-y-2 pl-6">
            <div className="flex items-center gap-2 text-xs">
              <Paperclip className="h-3.5 w-3.5" />
              <span>Files ({message.files.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.files.map((file, index) => {
                const label =
                  file.filename || file.name || `Attachment ${index + 1}`;
                const key = `${label}-${file.mime_type || "file"}-${index}`;

                if (file.url) {
                  return (
                    <a
                      className="rounded border bg-muted/40 px-3 py-1 text-xs transition-colors hover:bg-muted"
                      download={label}
                      href={file.url}
                      key={key}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {label}
                    </a>
                  );
                }

                return (
                  <div
                    className="rounded border bg-muted/40 px-3 py-1 text-xs"
                    key={key}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
