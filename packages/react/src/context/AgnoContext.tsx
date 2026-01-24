import { AgnoClient } from "@antipopp/agno-client";
import type { AgnoClientConfig } from "@antipopp/agno-types";
import type React from "react";
import { createContext, useContext, useEffect, useRef } from "react";
import { clearCustomRenderRegistry } from "../hooks/useAgnoToolExecution";
import { ComponentRegistry } from "../utils/component-registry";

/**
 * Context for providing AgnoClient instance
 */
const AgnoContext = createContext<AgnoClient | null>(null);

export interface AgnoProviderProps {
  config: AgnoClientConfig;
  children: React.ReactNode;
}

/**
 * Provider component that creates and manages an AgnoClient instance.
 * Handles cleanup of all module-level registries on unmount to prevent memory leaks.
 */
export function AgnoProvider({ config, children }: AgnoProviderProps) {
  const clientRef = useRef<AgnoClient | null>(null);

  if (clientRef.current === null) {
    clientRef.current = new AgnoClient(config);
  }

  const client = clientRef.current;

  useEffect(() => {
    client.updateConfig(config);
  }, [client, config]);

  useEffect(() => {
    return () => {
      // Dispose the client (clears event listeners, message store, pending UI specs)
      client.dispose();

      // Clear module-level registries to prevent memory leaks
      clearCustomRenderRegistry();
      ComponentRegistry.resetInstance();
    };
  }, [client]);

  return <AgnoContext.Provider value={client}>{children}</AgnoContext.Provider>;
}

/**
 * Hook to access the AgnoClient instance
 */
export function useAgnoClient(): AgnoClient {
  const client = useContext(AgnoContext);

  if (!client) {
    throw new Error("useAgnoClient must be used within an AgnoProvider");
  }

  return client;
}
