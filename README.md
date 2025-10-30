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

## 📚 Documentation

- [Core Client API](./packages/core/README.md)
- [React Hooks API](./packages/react/README.md)
- [Type Definitions](./packages/types/README.md)

## 🤝 Contributing

Contributions are welcome! This is an independent open-source project.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT

## 🙏 Acknowledgments

This library is built to work with [Agno](https://www.agno.dev) agents. It is an independent open-source project and is not officially affiliated with or endorsed by Agno.
