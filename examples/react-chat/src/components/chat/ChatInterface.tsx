import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { useAgnoChat, useAgnoToolExecution, type ToolHandler } from '@antipopp/agno-react'
import { Loader2, MessageSquare, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { ChatInput } from './ChatInput'
import { MessageItem } from './MessageItem'
import { StreamingIndicator } from './StreamingIndicator'

export function ChatInterface() {
  const { messages, sendMessage, isStreaming, error } = useAgnoChat()

  // Define tool handlers for frontend execution
  const toolHandlers: Record<string, ToolHandler> = {
    show_alert: async (args: Record<string, any>) => {
      const content = args.content as string
      console.log('[ChatInterface] Executing show_alert tool:', args)

      // Also show as toast notification
      toast.info('Alert from Agent', {
        description: content,
      })

      return {
        success: true,
        message: 'Alert displayed successfully',
        content: content,
      }
    },
  }

  // Use tool execution hook with auto-execution enabled
  const {
    isPaused,
    isExecuting,
    pendingTools,
    executionError,
  } = useAgnoToolExecution(toolHandlers, true)

  const handleSend = async (message: string) => {
    try {
      await sendMessage(message)
    } catch (err) {
      toast.error(`Failed to send message: ${error || err}`)
    }
  }

  console.log(messages)

  return (
    <div className="h-full flex flex-col">
      <Conversation className="relative w-full" style={{ height: '500px' }}>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare className="size-12" />}
              title="No messages yet"
              description="Start a conversation to see messages here"
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
        <div className="px-4 py-2 border-t border-border bg-accent/50">
          <div className="flex items-center gap-2 text-sm">
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Executing {pendingTools.length} tool{pendingTools.length !== 1 ? 's' : ''}...</span>
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                <span>Preparing to execute {pendingTools.length} tool{pendingTools.length !== 1 ? 's' : ''}...</span>
              </>
            )}
          </div>
        </div>
      )}

      {isStreaming && (
        <div className="px-4 py-2 border-t border-border">
          <StreamingIndicator />
        </div>
      )}

      {(error || executionError) && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-t border-destructive">
          {error || executionError}
        </div>
      )} 
    
      <div className="px-4 py-3 border-t border-border bg-background">
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming || isPaused}
          placeholder="Type your message..."
        />
      </div>
    </div>
  )
}
