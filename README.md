# Agno Client Libraries

Independent open-source client libraries for [Agno](https://www.agno.com) agents with streaming support.

## 📦 Packages

This monorepo contains three packages:

- **[@antipopp/agno-client](./packages/core)** - Core stateful client library
- **[@antipopp/agno-react](./packages/react)** - React hooks adapter
- **[@antipopp/agno-types](./packages/types)** - Shared TypeScript types

## 🔒 Security & Best Practices

Built with production-ready security features:

- **Request Cancellation** - AbortController support to prevent memory leaks and orphaned requests
- **Secure Logging** - Production-safe logger that automatically sanitizes auth tokens and sensitive data
- **URL Encoding** - Automatic encoding of entity IDs to prevent path traversal and injection attacks
- **Timestamp Validation** - Safe date handling with bounds checking to prevent invalid timestamps
- **Error Handling** - Graceful handling of malformed responses and content-type validation
- **Immutable State** - Consistent immutable updates throughout the codebase
- **Type Safety** - Full TypeScript support with comprehensive type definitions

## 🚀 Quick Start

### Installation

```bash
# For React applications
npm install @antipopp/agno-react

# For other JavaScript/TypeScript projects
npm install @antipopp/agno-client

# For types only (if using the core library)
npm install @antipopp/agno-types
```

### React Example

```tsx
import { AgnoProvider, useAgnoChat, useAgnoActions } from '@antipopp/agno-react';

function App() {
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'your-agent-id',
        userId: 'user-123', // Optional: Link sessions to a user
      }}
    >
      <ChatComponent />
    </AgnoProvider>
  );
}

function ChatComponent() {
  const { messages, sendMessage, isStreaming } = useAgnoChat();
  const { initialize } = useAgnoActions();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      <button
        onClick={() => sendMessage('Hello!')}
        disabled={isStreaming}
      >
        Send
      </button>
    </div>
  );
}
```

### Core Client Example

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'your-agent-id',
  userId: 'user-123', // Optional: Link sessions to a user
});

// Listen to events
client.on('message:update', (messages) => {
  console.log('Messages updated:', messages);
});

// Send a message
await client.sendMessage('Hello!');
```

## 🏗️ Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Watch mode for development
pnpm dev

# Type checking
pnpm typecheck
```

### Project Structure

```
agno-client/
├── packages/
│   ├── core/          # @antipopp/agno-client
│   ├── react/         # @antipopp/agno-react
│   └── types/         # @antipopp/agno-types
├── examples/
│   └── react-chat/    # Example React app
└── package.json       # Monorepo root
```

## ✨ Features

### Frontend Tool Execution (HITL)

The library includes built-in support for Human-in-the-Loop (HITL) frontend tool execution, allowing your Agno agents to delegate tools to the browser:

- **UI Automation**: Navigate pages, fill forms, click buttons
- **Browser APIs**: Access geolocation, notifications, local storage
- **User Confirmation**: Get user approval for sensitive operations
- **External Integrations**: Call APIs not accessible from the backend

### Generative UI

Create rich, interactive UI components directly from agent responses:

- **Agent-Driven Visualizations**: Let agents decide what charts and components to render
- **Interactive Charts**: Bar, line, area, and pie charts with export functionality (CSV/PNG)
- **Card Grids & Tables**: Display structured data with sortable, filterable tables
- **Custom Components**: Extend with your own component renderers
- **Persistent UI**: Components survive page refreshes (serializable specs)

See [Frontend Tool Execution & Generative UI Guide](./FRONTEND_TOOL_EXECUTION.md) for detailed usage instructions.

### Quick Example: Frontend Tools

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';

function ChatComponent() {
  const toolHandlers = {
    navigate_to_page: async (args: { url: string }) => {
      window.location.href = args.url;
      return { success: true };
    },
    get_location: async () => {
      const position = await new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(resolve)
      );
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    },
  };

  const { isPaused, isExecuting, pendingTools } =
    useAgnoToolExecution(toolHandlers);

  // Tools execute automatically when agent requests them
}
```

Tips:
- Handlers can return sync values or `Promise`s.
- Use `createValidatedToolHandler()` and `createToolArgsValidatorFromSafeParse()` for runtime argument validation (for example with Zod).

## 📚 Documentation

- [Core Client API](./packages/core/README.md)
- [React Hooks API](./packages/react/README.md)
- [Type Definitions](./packages/types/README.md)
- [Frontend Tool Execution & Generative UI](./FRONTEND_TOOL_EXECUTION.md)

## v1 Stability Policy

v1 is the public contract for the package APIs, runtime behavior, and documented release process. Stable surfaces follow SemVer and require a changelog entry for user-visible changes.

Stable for v1:
- Package entrypoint exports from `@antipopp/agno-types`, `@antipopp/agno-client`, and `@antipopp/agno-react`.
- Core client construction, streaming, sessions, cancellation through `abortStream()`, `cancelRun()`, and `dispose()`, plus headers, params, dependencies, and file uploads.
- React provider and hooks that wrap the core client without changing package layering.

Experimental for v1:
- Frontend tool execution, custom tool handlers, and generative UI rendering. These remain opt-in and may gain new helper APIs in minor releases.
- App-specific tool argument validation. The SDK provides helpers, but each app owns its schemas and approval rules.

Deferred beyond v1:
- A feature flag service, remote rollout engine, SDK-side flag registry, or hidden default behavior.
- A release automation framework such as Changesets or semantic-release.
- Treating examples as coverage gates. Examples are smoke checks only.

## Feature Flags

Feature flags are passed through existing request data, not through a platform owned by this SDK. Use `params` for backend-readable query flags and `dependencies` for run-scoped values merged into `sendMessage` requests. Global config sets defaults, and per-request options override or extend those defaults.

## Release Checklist

The release checklist is intentionally small and repo-local.

Before publishing a v1 release, run:

1. `pnpm release:check`
2. `pnpm ultracite check`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

Publish remains a manual, human-approved action. Humans approve SemVer breaks, final release notes, npm publish, and any rollback or deprecation plan.

## Roadmap

v1 stabilization work focuses on truthful coverage, regression tests for known blockers, release gates, and docs that match the shipped API. Post-v1 work can add broader AgentOS API coverage, richer generative UI helpers, example smoke automation, and release tooling only when the current lightweight gates stop being enough.

## Agent-assisted Maintenance

Agents may draft changelog entries, API-diff notes, release-risk reports, and checklist results. Agents may also run checks and point out SemVer risk. Agents must not approve SemVer breaks, publish packages, create npm releases, or finalize release notes without human review.

## 🤝 Contributing

Contributions are welcome! This is an independent open-source project.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Use `generate_schema.sh` to update AgentOS OpenAPI schema if needed
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

MIT

## 🙏 Acknowledgments

This library is built to work with [Agno](https://www.agno.dev) agents. It is an independent open-source project and is not officially affiliated with or endorsed by Agno.
