import { AgnoClient } from "@antipopp/agno-client";
import type { AgnoClientConfig } from "@antipopp/agno-types";
import type React from "react";
import { createContext, useContext, useEffect, useRef } from "react";

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
      client.removeAllListeners();
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
