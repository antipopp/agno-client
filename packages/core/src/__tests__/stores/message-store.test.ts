import type { ChatMessage } from "@antipopp/agno-types";
import { beforeEach, describe, expect, it } from "vitest";
import { MessageStore } from "../../stores/message-store";

describe("MessageStore", () => {
  let store: MessageStore;

  beforeEach(() => {
    store = new MessageStore();
  });

  describe("getMessages", () => {
    it("should return empty array initially", () => {
      expect(store.getMessages()).toEqual([]);
    });

    it("should return a copy of messages (immutable)", () => {
      const message: ChatMessage = {
        role: "user",
        content: "Hello",
        created_at: 1_700_000_000,
      };
      store.addMessage(message);

      const messages1 = store.getMessages();
      const messages2 = store.getMessages();

      expect(messages1).toEqual(messages2);
      expect(messages1).not.toBe(messages2); // Different array instances
    });
  });

  describe("setMessages", () => {
    it("should replace all messages", () => {
      store.addMessage({ role: "user", content: "Old", created_at: 1 });

      const newMessages: ChatMessage[] = [
        { role: "user", content: "New 1", created_at: 2 },
        { role: "agent", content: "New 2", created_at: 3 },
      ];
      store.setMessages(newMessages);

      expect(store.getMessages()).toHaveLength(2);
      expect(store.getMessages()[0].content).toBe("New 1");
    });

    it("should create a copy of input array (immutable)", () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "Test", created_at: 1 },
      ];
      store.setMessages(messages);

      messages.push({ role: "agent", content: "Added", created_at: 2 });

      expect(store.getMessages()).toHaveLength(1);
    });
  });

  describe("addMessage", () => {
    it("should add a message to the end", () => {
      store.addMessage({ role: "user", content: "First", created_at: 1 });
      store.addMessage({ role: "agent", content: "Second", created_at: 2 });

      const messages = store.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[1].content).toBe("Second");
    });

    it("should create new array when adding (shallow immutability)", () => {
      const message1: ChatMessage = {
        role: "user",
        content: "First",
        created_at: 1,
      };
      store.addMessage(message1);
      const messages1 = store.getMessages();

      const message2: ChatMessage = {
        role: "user",
        content: "Second",
        created_at: 2,
      };
      store.addMessage(message2);
      const messages2 = store.getMessages();

      // Different array instances
      expect(messages1).not.toBe(messages2);
      // Original array unchanged
      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(2);
    });
  });

  describe("updateLastMessage", () => {
    it("should return undefined if no messages", () => {
      const result = store.updateLastMessage((msg) => ({
        ...msg,
        content: "Updated",
      }));
      expect(result).toBeUndefined();
    });

    it("should update the last message", () => {
      store.addMessage({ role: "user", content: "First", created_at: 1 });
      store.addMessage({ role: "agent", content: "Last", created_at: 2 });

      const updated = store.updateLastMessage((msg) => ({
        ...msg,
        content: `${msg.content} updated`,
      }));

      expect(updated?.content).toBe("Last updated");
      expect(store.getMessages()[1].content).toBe("Last updated");
      expect(store.getMessages()[0].content).toBe("First"); // First message unchanged
    });

    it("should return the updated message", () => {
      store.addMessage({ role: "agent", content: "Original", created_at: 1 });

      const updated = store.updateLastMessage((msg) => ({
        ...msg,
        content: "New content",
        streamingError: true,
      }));

      expect(updated).toBeDefined();
      expect(updated?.content).toBe("New content");
      expect(updated?.streamingError).toBe(true);
    });
  });

  describe("updateMessage", () => {
    beforeEach(() => {
      store.addMessage({ role: "user", content: "First", created_at: 1 });
      store.addMessage({ role: "agent", content: "Second", created_at: 2 });
      store.addMessage({ role: "user", content: "Third", created_at: 3 });
    });

    it("should return undefined for negative index", () => {
      const result = store.updateMessage(-1, (msg) => ({
        ...msg,
        content: "Updated",
      }));
      expect(result).toBeUndefined();
    });

    it("should return undefined for out of bounds index", () => {
      const result = store.updateMessage(10, (msg) => ({
        ...msg,
        content: "Updated",
      }));
      expect(result).toBeUndefined();
    });

    it("should update message at specific index", () => {
      const updated = store.updateMessage(1, (msg) => ({
        ...msg,
        content: "Modified second",
      }));

      expect(updated?.content).toBe("Modified second");
      expect(store.getMessages()[1].content).toBe("Modified second");
      expect(store.getMessages()[0].content).toBe("First");
      expect(store.getMessages()[2].content).toBe("Third");
    });
  });

  describe("removeLastMessages", () => {
    beforeEach(() => {
      store.addMessage({ role: "user", content: "First", created_at: 1 });
      store.addMessage({ role: "agent", content: "Second", created_at: 2 });
      store.addMessage({ role: "user", content: "Third", created_at: 3 });
    });

    it("should remove last N messages", () => {
      store.removeLastMessages(2);
      expect(store.getMessages()).toHaveLength(1);
      expect(store.getMessages()[0].content).toBe("First");
    });

    it("should handle removing all messages", () => {
      store.removeLastMessages(3);
      expect(store.getMessages()).toHaveLength(0);
    });

    it("should handle removing more than available", () => {
      store.removeLastMessages(10);
      expect(store.getMessages()).toHaveLength(0);
    });
  });

  describe("clear", () => {
    it("should remove all messages", () => {
      store.addMessage({ role: "user", content: "Test", created_at: 1 });
      store.addMessage({ role: "agent", content: "Test", created_at: 2 });

      store.clear();

      expect(store.getMessages()).toHaveLength(0);
    });
  });

  describe("getLastMessage", () => {
    it("should return undefined if no messages", () => {
      expect(store.getLastMessage()).toBeUndefined();
    });

    it("should return the last message", () => {
      store.addMessage({ role: "user", content: "First", created_at: 1 });
      store.addMessage({ role: "agent", content: "Last", created_at: 2 });

      expect(store.getLastMessage()?.content).toBe("Last");
    });
  });

  describe("hasLastMessageError", () => {
    it("should return false if no messages", () => {
      expect(store.hasLastMessageError()).toBe(false);
    });

    it("should return false if last message has no error", () => {
      store.addMessage({
        role: "agent",
        content: "Response",
        created_at: 1,
        streamingError: false,
      });

      expect(store.hasLastMessageError()).toBe(false);
    });

    it("should return true if last message has streaming error", () => {
      store.addMessage({
        role: "agent",
        content: "Error",
        created_at: 1,
        streamingError: true,
      });

      expect(store.hasLastMessageError()).toBe(true);
    });
  });
});
