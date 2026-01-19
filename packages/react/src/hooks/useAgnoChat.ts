import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage, ClientState } from '@antipopp/agno-types';
import { useAgnoClient } from '../context/AgnoContext';

/**
 * Main hook for chat interactions
 * Provides messages, state, and methods to interact with the agent
 */
export function useAgnoChat() {
  const client = useAgnoClient();
  const [messages, setMessages] = useState<ChatMessage[]>(client.getMessages());
  const [state, setState] = useState<ClientState>(client.getState());
  const [error, setError] = useState<string | undefined>();

  // Listen to client events and update React state
  useEffect(() => {
    const handleMessageUpdate = (updatedMessages: ChatMessage[]) => {
      setMessages(updatedMessages);
    };

    const handleMessageComplete = (updatedMessages: ChatMessage[]) => {
      setMessages(updatedMessages);
    };

    const handleMessageRefreshed = (updatedMessages: ChatMessage[]) => {
      setMessages(updatedMessages);
    };

    const handleMessageError = (errorMessage: string) => {
      setError(errorMessage);
    };

    const handleStateChange = (newState: ClientState) => {
      setState(newState);
    };

    // Handle UI render event from frontend tool execution
    const handleUIRender = (event: any) => {
      const { tools } = event;

      // Update each tool call with its UI component
      for (const tool of tools) {
        if ((tool as any).ui_component) {
          client.hydrateToolCallUI(tool.tool_call_id, (tool as any).ui_component);
        }
      }
    };

    // Handle run cancelled event
    const handleRunCancelled = () => {
      // State is already updated via state:change event
      // This handler can be used for additional cancellation logic if needed
    };

    client.on('message:update', handleMessageUpdate);
    client.on('message:complete', handleMessageComplete);
    client.on('message:refreshed', handleMessageRefreshed);
    client.on('message:error', handleMessageError);
    client.on('state:change', handleStateChange);
    client.on('ui:render', handleUIRender);
    client.on('run:cancelled', handleRunCancelled);

    // Initialize state
    setMessages(client.getMessages());
    setState(client.getState());

    return () => {
      client.off('message:update', handleMessageUpdate);
      client.off('message:complete', handleMessageComplete);
      client.off('message:refreshed', handleMessageRefreshed);
      client.off('message:error', handleMessageError);
      client.off('state:change', handleStateChange);
      client.off('ui:render', handleUIRender);
      client.off('run:cancelled', handleRunCancelled);
    };
  }, [client]);

  /**
   * Send a message to the agent/team
   */
  const sendMessage = useCallback(
    async (message: string | FormData, options?: { headers?: Record<string, string>; params?: Record<string, string> }) => {
      setError(undefined);
      try {
        await client.sendMessage(message, options);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw err;
      }
    },
    [client]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    client.clearMessages();
    setMessages([]);
    setError(undefined);
  }, [client]);

  /**
   * Cancel the current run
   */
  const cancelRun = useCallback(async () => {
    try {
      await client.cancelRun();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [client]);

  return {
    messages,
    sendMessage,
    clearMessages,
    cancelRun,
    isStreaming: state.isStreaming,
    isRefreshing: state.isRefreshing,
    isPaused: state.isPaused,
    isCancelling: state.isCancelling,
    currentRunId: state.currentRunId,
    error,
    state,
  };
}
