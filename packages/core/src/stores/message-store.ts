import type { ChatMessage } from '@antipopp/agno-types';

/**
 * Manages message state with immutable updates
 */
export class MessageStore {
  private messages: ChatMessage[] = [];

  /**
   * Get all messages
   */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Set messages (replaces all)
   */
  setMessages(messages: ChatMessage[]): void {
    this.messages = [...messages];
  }

  /**
   * Add a message
   */
  addMessage(message: ChatMessage): void {
    this.messages = [...this.messages, message];
  }

  /**
   * Update the last message
   */
  updateLastMessage(
    updater: (lastMessage: ChatMessage) => ChatMessage
  ): ChatMessage | undefined {
    if (this.messages.length === 0) return undefined;

    const lastMessage = this.messages[this.messages.length - 1];
    const updatedMessage = updater(lastMessage);

    this.messages = [
      ...this.messages.slice(0, -1),
      updatedMessage,
    ];

    return updatedMessage;
  }

  /**
   * Remove last N messages
   */
  removeLastMessages(count: number): void {
    this.messages = this.messages.slice(0, -count);
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Get the last message
   */
  getLastMessage(): ChatMessage | undefined {
    return this.messages.length > 0
      ? this.messages[this.messages.length - 1]
      : undefined;
  }

  /**
   * Check if last message has streaming error
   */
  hasLastMessageError(): boolean {
    const lastMessage = this.getLastMessage();
    return lastMessage?.streamingError === true;
  }
}
