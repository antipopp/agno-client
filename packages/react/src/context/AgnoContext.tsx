import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { AgnoClient } from '@antipopp/agno-client';
import type { AgnoClientConfig } from '@antipopp/agno-types';

/**
 * Context for providing AgnoClient instance
 */
const AgnoContext = createContext<AgnoClient | null>(null);

export interface AgnoProviderProps {
  config: AgnoClientConfig;
  children: React.ReactNode;
}

/**
 * Provider component that creates and manages an AgnoClient instance
 */
export function AgnoProvider({ config, children }: AgnoProviderProps) {
  // Create client only once using useMemo (React best practice)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const client = useMemo(() => new AgnoClient(config), []);

  // Sync config changes to the client instance
  useEffect(() => {
    client.updateConfig(config);
  }, [client, config]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Remove all event listeners when provider unmounts
      client.removeAllListeners();
    };
  }, [client]);

  return (
    <AgnoContext.Provider value={client}>
      {children}
    </AgnoContext.Provider>
  );
}

/**
 * Hook to access the AgnoClient instance
 */
export function useAgnoClient(): AgnoClient {
  const client = useContext(AgnoContext);

  if (!client) {
    throw new Error('useAgnoClient must be used within an AgnoProvider');
  }

  return client;
}
