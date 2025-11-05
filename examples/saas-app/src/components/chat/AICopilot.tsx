import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { useAgnoChat, useAgnoToolExecution } from '@antipopp/agno-react'
import { Bot, Loader2 } from 'lucide-react'
import { ChatInput } from './ChatInput'
import { MessageItem } from './MessageItem'

export function AICopilot() {
  const { messages, sendMessage, isStreaming, error } = useAgnoChat()

  // Set up tool execution with global handlers (from ToolHandlerProvider)
  // This enables the event listener for run:paused events
  const { isPaused, isExecuting, pendingTools } = useAgnoToolExecution()

  const handleSend = async (message: string) => {
    try {
      await sendMessage(message)
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-background">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Report Assistant</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Ask me anything about your reports and analytics
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<Bot className="h-12 w-12 text-muted-foreground" />}
                title="Ready to help"
                description="Start a conversation to get assistance with your reports"
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
        <div className="px-4 py-2 border-t border-border bg-accent/50">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {isExecuting
                ? 'Executing tools...'
                : isPaused
                ? `Processing ${pendingTools.length} tool(s)...`
                : 'AI is thinking...'}
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-t border-destructive">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-background">
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder="Ask about your reports..."
        />
      </div>
    </div>
  )
}
