import { useAgnoChat } from '@antipopp/agno-react'
import { MessageList } from './MessageList'
import { PromptInput } from './PromptInput'
import { StreamingIndicator } from './StreamingIndicator'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function ChatInterface() {
  const { messages, sendMessage, clearMessages, isStreaming, error } = useAgnoChat()
  
  const handleSend = async (message: string) => {
    try {
      await sendMessage(message)
    } catch (err) {
      toast.error(`Failed to send message: ${error || err}`)
    }
  }

  const handleClear = () => {
    clearMessages()
    toast.success('Chat cleared')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Start a conversation with your agent</p>
            </div>
          </div>
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}
      </div>

      {/* Streaming Indicator */}
      {isStreaming && (
        <div className="px-4 py-2 border-t border-border">
          <StreamingIndicator />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-t border-destructive">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <PromptInput
              onSend={handleSend}
              disabled={isStreaming}
              placeholder="Type your message..."
            />
          </div>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              disabled={isStreaming}
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
