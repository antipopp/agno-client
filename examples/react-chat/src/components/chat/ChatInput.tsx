import type { ChatStatus } from "ai";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel: () => void;
  status: ChatStatus;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onCancel,
  status,
  disabled,
  placeholder,
}: ChatInputProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    if (status === "streaming") {
      onCancel();
      return;
    }

    // Extract text from the message
    const text = message.text?.trim();

    if (text) {
      onSend(text);
    }
  };

  return (
    <PromptInput
      accept="image/*"
      className="w-full"
      multiple
      onSubmit={handleSubmit}
    >
      <PromptInputBody>
        <PromptInputTextarea
          disabled={disabled}
          placeholder={
            placeholder ||
            "Type your message... (Enter to send, Shift+Enter for new line)"
          }
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools />
        <PromptInputSubmit disabled={disabled} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
}
