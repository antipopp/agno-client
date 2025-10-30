import { useState, useCallback } from 'react';
import type { AgentDetails, TeamDetails } from '@antipopp/agno-types';
import { useAgnoClient } from '../context/AgnoContext';

/**
 * Hook for common actions like initialization, fetching agents/teams
 */
export function useAgnoActions() {
  const client = useAgnoClient();
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  /**
   * Initialize the client (check status and fetch agents/teams)
   */
  const initialize = useCallback(async (): Promise<{
    agents: AgentDetails[];
    teams: TeamDetails[];
  }> => {
    setIsInitializing(true);
    setError(undefined);
    try {
      const result = await client.initialize();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [client]);

  /**
   * Check endpoint status
   */
  const checkStatus = useCallback(async (): Promise<boolean> => {
    setError(undefined);
    try {
      return await client.checkStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    }
  }, [client]);

  /**
   * Fetch agents
   */
  const fetchAgents = useCallback(async (): Promise<AgentDetails[]> => {
    setError(undefined);
    try {
      return await client.fetchAgents();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [client]);

  /**
   * Fetch teams
   */
  const fetchTeams = useCallback(async (): Promise<TeamDetails[]> => {
    setError(undefined);
    try {
      return await client.fetchTeams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [client]);

  /**
   * Update client configuration
   */
  const updateConfig = useCallback(
    (updates: Partial<Parameters<typeof client.updateConfig>[0]>) => {
      client.updateConfig(updates);
    },
    [client]
  );

  return {
    initialize,
    checkStatus,
    fetchAgents,
    fetchTeams,
    updateConfig,
    isInitializing,
    error,
  };
}
