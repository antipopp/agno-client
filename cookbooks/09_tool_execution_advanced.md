# 9. Tool Execution Advanced

> **Prerequisites**: [08. Tool Execution Basics](./08_tool_execution_basics.md)
> **Packages**: `@antipopp/agno-react`

## Overview

This cookbook covers advanced HITL patterns including global tool handlers via context, manual confirmation flows, selective tool execution, and combining HITL with Generative UI.

## Global Tool Handlers with ToolHandlerProvider

Use `ToolHandlerProvider` to define handlers once and use them across all components:

```tsx
import {
  AgnoProvider,
  ToolHandlerProvider,
  useAgnoToolExecution,
} from '@antipopp/agno-react';

// Define global handlers
const globalHandlers = {
  get_current_url: async () => ({ url: window.location.href }),
  get_user_timezone: async () => ({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }),
  show_toast: async (args) => {
    // Show a toast notification
    showToast(args.message, args.type);
    return { shown: true };
  },
};

function App() {
  return (
    <AgnoProvider config={config}>
      <ToolHandlerProvider handlers={globalHandlers}>
        <Chat />
      </ToolHandlerProvider>
    </AgnoProvider>
  );
}

// In any child component, these handlers are automatically used
function Chat() {
  // No need to pass handlers - they come from context
  const { isPaused, pendingTools } = useAgnoToolExecution();

  // Can also add local handlers that merge with global ones
  const localHandlers = {
    local_only_tool: async (args) => ({ result: 'local' }),
  };

  // Local handlers take precedence over global handlers with same name
  useAgnoToolExecution(localHandlers);

  return <ChatUI />;
}
```

### Nested Providers for Scoped Handlers

```tsx
import { ToolHandlerProvider, useAgnoToolExecution } from '@antipopp/agno-react';

function App() {
  return (
    <ToolHandlerProvider handlers={appLevelHandlers}>
      <Dashboard />
      <AdminPanel />
    </ToolHandlerProvider>
  );
}

function AdminPanel() {
  // Admin-specific handlers that override app-level
  const adminHandlers = {
    delete_user: async (args) => {
      await adminAPI.deleteUser(args.userId);
      return { deleted: true };
    },
  };

  return (
    <ToolHandlerProvider handlers={adminHandlers}>
      <AdminChat />
    </ToolHandlerProvider>
  );
}
```

## Manual Confirmation Flows

### Basic Confirmation Dialog

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';
import type { ToolCall } from '@antipopp/agno-types';

function Chat() {
  const handlers = {
    delete_file: async (args) => {
      await deleteFile(args.path);
      return { deleted: true };
    },
    send_email: async (args) => {
      await sendEmail(args.to, args.subject, args.body);
      return { sent: true };
    },
  };

  const {
    isPaused,
    pendingTools,
    executeAndContinue,
    continueWithResults,
    isExecuting,
  } = useAgnoToolExecution(handlers, false); // Manual mode

  const handleApprove = () => {
    executeAndContinue();
  };

  const handleReject = async () => {
    // Create rejected results for all tools
    const rejectedTools = pendingTools.map(tool => ({
      ...tool,
      result: JSON.stringify({
        rejected: true,
        reason: 'User declined to execute this action',
      }),
    }));
    await continueWithResults(rejectedTools);
  };

  if (isPaused && pendingTools.length > 0) {
    return (
      <ConfirmationDialog
        tools={pendingTools}
        onApprove={handleApprove}
        onReject={handleReject}
        isExecuting={isExecuting}
      />
    );
  }

  return <ChatUI />;
}

function ConfirmationDialog({
  tools,
  onApprove,
  onReject,
  isExecuting,
}: {
  tools: ToolCall[];
  onApprove: () => void;
  onReject: () => void;
  isExecuting: boolean;
}) {
  return (
    <div className="confirmation-dialog">
      <h3>Action Required</h3>
      <p>The agent wants to perform the following actions:</p>

      {tools.map((tool) => (
        <div key={tool.tool_call_id} className="tool-preview">
          <h4>{formatToolName(tool.tool_name)}</h4>
          <dl>
            {Object.entries(tool.tool_args).map(([key, value]) => (
              <div key={key}>
                <dt>{key}:</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <div className="actions">
        <button onClick={onReject} disabled={isExecuting}>
          Reject
        </button>
        <button onClick={onApprove} disabled={isExecuting}>
          {isExecuting ? 'Executing...' : 'Approve'}
        </button>
      </div>
    </div>
  );
}
```

### Selective Tool Approval

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';
import { useState } from 'react';

function Chat() {
  const {
    isPaused,
    pendingTools,
    executeTools,
    continueWithResults,
    isExecuting,
  } = useAgnoToolExecution(handlers, false);

  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  const handleToggleTool = (toolId: string) => {
    setSelectedTools(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    // Execute only selected tools
    const toolsToExecute = pendingTools.filter(t =>
      selectedTools.has(t.tool_call_id)
    );
    const toolsToReject = pendingTools.filter(t =>
      !selectedTools.has(t.tool_call_id)
    );

    // Execute selected tools
    const executedTools = await executeTools(toolsToExecute);

    // Create rejected results for unselected tools
    const rejectedTools = toolsToReject.map(tool => ({
      ...tool,
      result: JSON.stringify({ rejected: true, reason: 'Not approved by user' }),
    }));

    // Continue with all results
    await continueWithResults([...executedTools, ...rejectedTools]);
    setSelectedTools(new Set());
  };

  if (isPaused) {
    return (
      <div className="selective-approval">
        <h3>Select actions to approve:</h3>
        {pendingTools.map((tool) => (
          <label key={tool.tool_call_id}>
            <input
              type="checkbox"
              checked={selectedTools.has(tool.tool_call_id)}
              onChange={() => handleToggleTool(tool.tool_call_id)}
            />
            {tool.tool_name}: {JSON.stringify(tool.tool_args)}
          </label>
        ))}
        <button onClick={handleSubmit} disabled={isExecuting}>
          Continue
        </button>
      </div>
    );
  }

  return <ChatUI />;
}
```

## Tool Execution with User Input

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';
import { useState } from 'react';

function Chat() {
  const {
    isPaused,
    pendingTools,
    continueWithResults,
    isExecuting,
  } = useAgnoToolExecution({}, false);

  const [userInputs, setUserInputs] = useState<Record<string, string>>({});

  // Find tools that require user input
  const toolsNeedingInput = pendingTools.filter(t => t.requires_user_input);

  const handleInputChange = (toolId: string, value: string) => {
    setUserInputs(prev => ({ ...prev, [toolId]: value }));
  };

  const handleSubmit = async () => {
    const resultsWithInput = pendingTools.map(tool => {
      if (tool.requires_user_input) {
        return {
          ...tool,
          result: JSON.stringify({
            user_input: userInputs[tool.tool_call_id] || '',
          }),
        };
      }
      return tool;
    });

    await continueWithResults(resultsWithInput);
    setUserInputs({});
  };

  if (isPaused && toolsNeedingInput.length > 0) {
    return (
      <div className="user-input-form">
        <h3>Additional Information Needed</h3>
        {toolsNeedingInput.map((tool) => (
          <div key={tool.tool_call_id}>
            <label>
              {tool.tool_args.prompt || `Input for ${tool.tool_name}`}:
              <input
                type="text"
                value={userInputs[tool.tool_call_id] || ''}
                onChange={(e) => handleInputChange(tool.tool_call_id, e.target.value)}
              />
            </label>
          </div>
        ))}
        <button onClick={handleSubmit} disabled={isExecuting}>
          Submit
        </button>
      </div>
    );
  }

  return <ChatUI />;
}
```

## Session Reload UI Hydration

When loading a session, tool calls may have been executed previously. The hook automatically re-runs handlers to regenerate UI:

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';
import { useAgnoSession } from '@antipopp/agno-react';

function App() {
  // These handlers are re-executed when a session loads
  // to regenerate any UI components for historical tool calls
  const handlers = {
    show_chart: async (args) => {
      // Return UI specification
      return createBarChart(args.data, args.xKey, args.yKeys);
    },
    show_table: async (args) => {
      return createTable(args.data, args.columns);
    },
  };

  // The hook listens to session:loaded events
  // and re-executes handlers for historical tool calls
  useAgnoToolExecution(handlers);

  const { loadSession } = useAgnoSession();

  // When loading a session, UI for tool calls is regenerated
  const handleLoadSession = async (sessionId: string) => {
    await loadSession(sessionId);
    // UI components are automatically hydrated
  };

  return <Chat />;
}
```

## Combining Multiple Tool Types

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';

function App() {
  const handlers = {
    // Auto-execute: No user interaction needed
    get_browser_info: async () => ({
      userAgent: navigator.userAgent,
      language: navigator.language,
    }),

    // Manual confirmation required (sensitive)
    delete_all_data: async () => {
      localStorage.clear();
      sessionStorage.clear();
      return { cleared: true };
    },

    // Returns UI component
    show_analytics: async (args) => {
      const data = await fetchAnalytics(args.metric);
      return createLineChart(data, 'date', [{ key: 'value' }], {
        title: `${args.metric} Analytics`,
      });
    },

    // Requires user input
    get_user_preference: async (args) => {
      // Will show input dialog, result comes from user
      return { prompt: args.question };
    },
  };

  const {
    isPaused,
    pendingTools,
    executeAndContinue,
    continueWithResults,
  } = useAgnoToolExecution(handlers, false); // Manual mode for control

  // Check what types of tools are pending
  const hasConfirmationTools = pendingTools.some(t => t.requires_confirmation);
  const hasInputTools = pendingTools.some(t => t.requires_user_input);
  const hasAutoTools = pendingTools.some(t =>
    !t.requires_confirmation && !t.requires_user_input
  );

  if (isPaused) {
    // Show appropriate UI based on pending tool types
    if (hasInputTools) {
      return <UserInputForm tools={pendingTools} onSubmit={continueWithResults} />;
    }
    if (hasConfirmationTools) {
      return <ConfirmationDialog tools={pendingTools} onConfirm={executeAndContinue} />;
    }
    if (hasAutoTools) {
      // Auto-execute safe tools
      executeAndContinue();
    }
  }

  return <Chat />;
}
```

## Key Points

- **ToolHandlerProvider** enables global handlers shared across components
- Local handlers passed to `useAgnoToolExecution()` override global handlers
- Set `autoExecute=false` for manual confirmation flows
- Use `executeTools()` to execute specific tools without continuing
- Use `continueWithResults()` to continue with custom results (e.g., rejections)
- Tools can have `requires_confirmation` or `requires_user_input` flags
- Session loading automatically re-runs handlers for UI hydration
- Combine different tool types with conditional UI rendering

## Next Steps

Continue to [10. Generative UI: Charts](./10_generative_ui_charts.md) to learn about creating visual UI components from tool handlers.
