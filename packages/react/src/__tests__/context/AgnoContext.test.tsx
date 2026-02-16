import type { AgnoClientConfig } from "@antipopp/agno-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgnoProvider, useAgnoClient } from "../../context/AgnoContext";

const TestComponent = () => {
  const client = useAgnoClient();
  return <div data-testid="config">{client.getConfig().endpoint}</div>;
};

describe("AgnoContext", () => {
  const defaultConfig: AgnoClientConfig = {
    endpoint: "http://localhost:7777",
    mode: "agent",
    agentId: "test-agent",
  };

  describe("AgnoProvider", () => {
    it("should render children", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <div data-testid="child">Child content</div>
        </AgnoProvider>
      );

      expect(screen.getByTestId("child")).toBeDefined();
      expect(screen.getByTestId("child").textContent).toBe("Child content");
    });

    it("should provide client to children", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("config").textContent).toBe(
        "http://localhost:7777"
      );
    });

    it("should maintain same client instance across re-renders", () => {
      const clientInstances: any[] = [];

      const CaptureClient = () => {
        const client = useAgnoClient();
        clientInstances.push(client);
        return null;
      };

      const { rerender } = render(
        <AgnoProvider config={defaultConfig}>
          <CaptureClient />
        </AgnoProvider>
      );

      rerender(
        <AgnoProvider config={defaultConfig}>
          <CaptureClient />
        </AgnoProvider>
      );

      expect(clientInstances[0]).toBe(clientInstances[1]);
    });

    it("should call updateConfig when config prop changes", () => {
      // Capture the client to verify updateConfig is called
      let capturedClient: any = null;

      const CaptureClient = () => {
        capturedClient = useAgnoClient();
        return null;
      };

      const { rerender } = render(
        <AgnoProvider config={defaultConfig}>
          <CaptureClient />
        </AgnoProvider>
      );

      // Spy on updateConfig after capturing the client
      const updateConfigSpy = vi.spyOn(capturedClient, "updateConfig");

      // When config prop changes, useEffect should call updateConfig
      rerender(
        <AgnoProvider
          config={{ ...defaultConfig, endpoint: "http://new-endpoint.com" }}
        >
          <CaptureClient />
        </AgnoProvider>
      );

      expect(updateConfigSpy).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: "http://new-endpoint.com" })
      );

      updateConfigSpy.mockRestore();
    });
  });

  describe("useAgnoClient", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useAgnoClient must be used within an AgnoProvider");

      consoleSpy.mockRestore();
    });

    it("should return client with correct config", () => {
      let capturedClient: any = null;

      const CaptureClient = () => {
        capturedClient = useAgnoClient();
        return null;
      };

      render(
        <AgnoProvider config={defaultConfig}>
          <CaptureClient />
        </AgnoProvider>
      );

      expect(capturedClient).not.toBeNull();
      expect(capturedClient.getConfig().endpoint).toBe("http://localhost:7777");
      expect(capturedClient.getConfig().agentId).toBe("test-agent");
    });

    it("should return client with working methods", () => {
      let capturedClient: any = null;

      const CaptureClient = () => {
        capturedClient = useAgnoClient();
        return null;
      };

      render(
        <AgnoProvider config={defaultConfig}>
          <CaptureClient />
        </AgnoProvider>
      );

      // Test that client methods exist and work
      expect(typeof capturedClient.getMessages).toBe("function");
      expect(typeof capturedClient.getState).toBe("function");
      expect(typeof capturedClient.updateConfig).toBe("function");
      expect(typeof capturedClient.clearMessages).toBe("function");

      expect(capturedClient.getMessages()).toEqual([]);
      expect(capturedClient.getState().isStreaming).toBe(false);
    });
  });
});
