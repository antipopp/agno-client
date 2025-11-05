import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ToolHandler } from '../hooks/useAgnoToolExecution';

/**
 * Context value for tool handler registry
 */
export interface ToolHandlerContextValue {
  handlers: Record<string, ToolHandler>;
  registerHandler: (name: string, handler: ToolHandler) => void;
  unregisterHandler: (name: string) => void;
}

/**
 * Context for providing global tool handlers
 */
const ToolHandlerContext = createContext<ToolHandlerContextValue | null>(null);

export interface ToolHandlerProviderProps {
  handlers?: Record<string, ToolHandler>;
  children: React.ReactNode;
}

/**
 * Provider component that manages global tool handlers
 *
 * @example
 * ```tsx
 * const globalHandlers = {
 *   fill_form: async (args) => {
 *     // Implementation
 *     return { success: true };
 *   }
 * };
 *
 * <ToolHandlerProvider handlers={globalHandlers}>
 *   <App />
 * </ToolHandlerProvider>
 * ```
 */
export function ToolHandlerProvider({ handlers: initialHandlers = {}, children }: ToolHandlerProviderProps) {
  const [handlers, setHandlers] = useState<Record<string, ToolHandler>>(initialHandlers);

  /**
   * Register a new tool handler or update an existing one
   */
  const registerHandler = useCallback((name: string, handler: ToolHandler) => {
    setHandlers(prev => ({ ...prev, [name]: handler }));
  }, []);

  /**
   * Unregister a tool handler
   */
  const unregisterHandler = useCallback((name: string) => {
    setHandlers(prev => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const value: ToolHandlerContextValue = {
    handlers,
    registerHandler,
    unregisterHandler,
  };

  return (
    <ToolHandlerContext.Provider value={value}>
      {children}
    </ToolHandlerContext.Provider>
  );
}

/**
 * Hook to access global tool handlers
 *
 * @returns Tool handler context value or null if not within ToolHandlerProvider
 *
 * @example
 * ```tsx
 * const { handlers, registerHandler } = useToolHandlers() || { handlers: {} };
 * ```
 */
export function useToolHandlers(): ToolHandlerContextValue | null {
  return useContext(ToolHandlerContext);
}
