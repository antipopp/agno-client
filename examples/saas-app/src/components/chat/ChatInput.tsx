import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
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
    const text = message.text?.trim()
    if (text) {
      onSend(text)
    }
  }

  const status = disabled ? 'submitted' : undefined

  return (
    <PromptInput
      onSubmit={handleSubmit}
      className="w-full"
    >
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={placeholder || 'Ask me anything about your reports...'}
          disabled={disabled}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputSubmit disabled={disabled} status={status} />
      </PromptInputFooter>
    </PromptInput>
  )
}
