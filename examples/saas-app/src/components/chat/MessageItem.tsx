import { Response } from '@/components/ai-elements/response'
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ChatMessage } from '@antipopp/agno-types'
import { Bot, User } from 'lucide-react'

interface MessageItemProps {
  message: ChatMessage
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'

  return (
    <div className="space-y-2 py-3">
      {/* Role Badge */}
      <div className="flex items-center gap-2">
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
        <Badge variant={isUser ? 'secondary' : 'default'} className="text-xs">
          {isUser ? 'You' : 'AI Assistant'}
        </Badge>
        <span className="text-xs text-muted-foreground">
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
            {message.tool_calls.map((tool: any, idx: number) => (
              <Tool key={tool.tool_call_id || idx} defaultOpen={false}>
                <ToolHeader
                  title={tool.tool_name}
                  type="tool-use"
                  state={tool.tool_call_error ? 'output-error' : 'output-available'}
                />
                <ToolContent>
                  <ToolInput input={tool.tool_args} />
                  {tool.content && (
                    <ToolOutput
                      output={tool.content}
                      errorText={tool.tool_call_error ? 'Tool execution failed' : undefined}
                    />
                  )}
                </ToolContent>
              </Tool>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
