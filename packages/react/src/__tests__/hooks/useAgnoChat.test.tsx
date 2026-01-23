import type { AgnoClientConfig } from "@antipopp/agno-types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it } from "vitest";
import { AgnoProvider } from "../../context/AgnoContext";
import { useAgnoChat } from "../../hooks/useAgnoChat";

const defaultConfig: AgnoClientConfig = {
  endpoint: "http://localhost:7777",
  mode: "agent",
  agentId: "test-agent",
};

// Test component that exposes hook values
const TestChatComponent = ({
  onStateChange,
}: {
  onStateChange?: (state: ReturnType<typeof useAgnoChat>) => void;
}) => {
  const chatState = useAgnoChat();
  const { messages, isStreaming, error, clearMessages } = chatState;

  React.useEffect(() => {
    onStateChange?.(chatState);
  }, [chatState, onStateChange]);

  return (
    <div>
      <div data-testid="messages">{JSON.stringify(messages)}</div>
      <div data-testid="streaming">{isStreaming ? "true" : "false"}</div>
      <div data-testid="error">{error || "none"}</div>
      <button data-testid="clear" onClick={clearMessages}>
        Clear
      </button>
    </div>
  );
};

describe("useAgnoChat", () => {
  describe("initial state", () => {
    it("should start with empty messages", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestChatComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("messages").textContent).toBe("[]");
    });

    it("should start not streaming", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestChatComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("streaming").textContent).toBe("false");
    });

    it("should start with no error", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestChatComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("error").textContent).toBe("none");
    });
  });

  describe("clearMessages", () => {
    it("should clear all messages", async () => {
      const user = userEvent.setup();

      render(
        <AgnoProvider config={defaultConfig}>
          <TestChatComponent />
        </AgnoProvider>
      );

      await user.click(screen.getByTestId("clear"));

      await waitFor(() => {
        expect(screen.getByTestId("messages").textContent).toBe("[]");
      });
    });
  });

  describe("state updates", () => {
    it("should provide isStreaming state", () => {
      let capturedState: ReturnType<typeof useAgnoChat> | null = null;

      render(
        <AgnoProvider config={defaultConfig}>
          <TestChatComponent
            onStateChange={(state) => {
              capturedState = state;
            }}
          />
        </AgnoProvider>
      );

      expect(capturedState!.isStreaming).toBe(false);
    });

    it("should provide isRefreshing state", () => {
      let capturedState: ReturnType<typeof useAgnoChat> | null = null;

      render(
        <AgnoProvider config={defaultConfig}>
          <TestChatComponent
            onStateChange={(state) => {
              capturedState = state;
            }}
          />
        </AgnoProvider>
      );

      expect(capturedState!.isRefreshing).toBe(false);
    });

    it("should provide isPaused state", () => {
      let capturedState: ReturnType<typeof useAgnoChat> | null = null;

      render(
        <AgnoProvider config={defaultConfig}>
          <TestChatComponent
            onStateChange={(state) => {
              capturedState = state;
            }}
          />
        </AgnoProvider>
      );

      expect(capturedState!.isPaused).toBe(false);
    });

    it("should provide state object", () => {
      let capturedState: ReturnType<typeof useAgnoChat> | null = null;

      render(
        <AgnoProvider config={defaultConfig}>
          <TestChatComponent
            onStateChange={(state) => {
              capturedState = state;
            }}
          />
        </AgnoProvider>
      );

      expect(capturedState!.state).toBeDefined();
      expect(capturedState!.state.isStreaming).toBe(false);
      expect(capturedState!.state.isRefreshing).toBe(false);
      expect(capturedState!.state.isPaused).toBe(false);
    });
  });
});
