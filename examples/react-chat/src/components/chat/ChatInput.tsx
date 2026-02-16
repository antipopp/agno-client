import type { ChatStatus } from "ai";
import { toast } from "sonner";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

const SUPPORTED_ATTACHMENT_ACCEPT = [
  "image/*",
  "audio/*",
  "video/*",
  ".pdf",
  ".txt",
  ".csv",
  ".json",
  ".md",
  ".docx",
  ".html",
  ".css",
  ".xml",
  ".rtf",
  ".js",
  ".py",
].join(",");

export type ChatInputMessage = PromptInputMessage;

interface ChatInputProps {
  onSend: (message: ChatInputMessage) => void | Promise<void>;
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
    if (status === "streaming" && !disabled) {
      onCancel();
      return;
    }

    const text = message.text?.trim();
    const files = message.files ?? [];

    if (!text && files.length === 0) {
      return;
    }

    return onSend({
      ...message,
      text,
    });
  };

  return (
    <PromptInput
      accept={SUPPORTED_ATTACHMENT_ACCEPT}
      className="w-full"
      maxFileSize={25 * 1024 * 1024}
      maxFiles={8}
      multiple
      onError={({ message }) => {
        toast.error(message);
      }}
      onSubmit={handleSubmit}
    >
      <PromptInputHeader>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
      </PromptInputHeader>
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
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        <PromptInputSubmit disabled={disabled} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
}
