import { useState, useEffect, useCallback } from 'react';
import type { SessionEntry, ChatMessage } from '@antipopp/agno-types';
import { useAgnoClient } from '../context/AgnoContext';

/**
 * Hook for session management
 */
export function useAgnoSession() {
  const client = useAgnoClient();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    client.getConfig().sessionId
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Listen to session events
  useEffect(() => {
    const handleSessionLoaded = (sessionId: string) => {
      setCurrentSessionId(sessionId);
    };

    const handleSessionCreated = (session: SessionEntry) => {
      setSessions((prev) => [session, ...prev]);
      setCurrentSessionId(session.session_id);
    };

    const handleStateChange = () => {
      const config = client.getConfig();
      setCurrentSessionId(config.sessionId);
      setSessions(client.getState().sessions);
    };

    client.on('session:loaded', handleSessionLoaded);
    client.on('session:created', handleSessionCreated);
    client.on('state:change', handleStateChange);

    // Initialize
    setSessions(client.getState().sessions);
    setCurrentSessionId(client.getConfig().sessionId);

    return () => {
      client.off('session:loaded', handleSessionLoaded);
      client.off('session:created', handleSessionCreated);
      client.off('state:change', handleStateChange);
    };
  }, [client]);

  /**
   * Load a specific session
   */
  const loadSession = useCallback(
    async (sessionId: string): Promise<ChatMessage[]> => {
      setIsLoading(true);
      setError(undefined);
      try {
        const messages = await client.loadSession(sessionId);
        setCurrentSessionId(sessionId);
        return messages;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  /**
   * Fetch all sessions
   */
  const fetchSessions = useCallback(async (): Promise<SessionEntry[]> => {
    setIsLoading(true);
    setError(undefined);
    try {
      const fetchedSessions = await client.fetchSessions();
      setSessions(fetchedSessions);
      return fetchedSessions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  return {
    sessions,
    currentSessionId,
    loadSession,
    fetchSessions,
    isLoading,
    error,
  };
}
