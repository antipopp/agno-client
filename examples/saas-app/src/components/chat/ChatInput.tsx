import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (text) {
      onSend(text);
    }
  };

  const status = disabled ? "submitted" : undefined;

  return (
    <PromptInput className="w-full" onSubmit={handleSubmit}>
      <PromptInputBody>
        <PromptInputTextarea
          disabled={disabled}
          placeholder={placeholder || "Ask me anything about your reports..."}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputSubmit disabled={disabled} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
}
