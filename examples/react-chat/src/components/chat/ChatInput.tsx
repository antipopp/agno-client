import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    // Extract text from the message
    const text = message.text?.trim()

    if (text) {
      onSend(text)
    }
  }

  const status = disabled ? 'submitted' : undefined

  return (
    <PromptInput
      onSubmit={handleSubmit}
      accept="image/*"
      multiple
      className="w-full"
    >
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={placeholder || 'Type your message... (Enter to send, Shift+Enter for new line)'}
          disabled={disabled}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools />
        <PromptInputSubmit disabled={disabled} status={status} />
      </PromptInputFooter>
    </PromptInput>
  )
}
