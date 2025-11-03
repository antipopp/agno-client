# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-03

### Added

#### Core Library (@antipopp/agno-client)
- Initial release of the core Agno client library
- Stateful client with EventEmitter architecture
- Real-time streaming support with incremental JSON parsing
- Message store with immutable state management
- Configuration manager for endpoint, auth, and mode settings
- Session manager for fetching and converting session history
- Event processor for handling RunEvent types
- Support for both agent and team modes
- Request cancellation with AbortController
- Secure logging with automatic token sanitization
- URL encoding for entity IDs
- Timestamp validation with bounds checking
- **Frontend tool execution (HITL)** support via `continueRun()` method
- `RunPaused` and `RunContinued` event handling

#### React Package (@antipopp/agno-react)
- Initial release of React hooks adapter
- `AgnoProvider` component for client context
- `useAgnoClient()` - Access the core client instance
- `useAgnoChat()` - Message management and streaming
- `useAgnoSession()` - Session loading and management
- `useAgnoActions()` - Initialization and helper actions
- **`useAgnoToolExecution()`** - Frontend tool execution hook with auto-execution and manual confirmation modes
- Event synchronization between core client and React state
- Single client instance pattern with useRef

#### Types Package (@antipopp/agno-types)
- Initial release of TypeScript types
- Full type coverage for Agno API specification
- RunEvent enum with all event types (including RunPaused, RunContinued)
- ChatMessage, ToolCall, ReasoningSteps types
- API response types (RunResponse, SessionEntry, AgentDetails, TeamDetails)
- Configuration and state types
- Client event types

### Features

- **Streaming Support**: Real-time streaming with incremental JSON parsing
- **Event-Driven Architecture**: EventEmitter pattern for decoupled communication
- **Frontend Tool Execution**: Human-in-the-Loop (HITL) support for delegating tools to the frontend
  - Auto-execution mode for seamless tool handling
  - Manual confirmation mode for sensitive operations
  - Error handling and result processing
- **Security First**: Built-in security features including token sanitization, URL encoding, and request cancellation
- **Framework Agnostic**: Core library works with any JavaScript/TypeScript framework
- **React Integration**: Purpose-built hooks for React applications
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Session Management**: Load, create, and delete sessions
- **Agent & Team Support**: Works with both agent and team modes

### Documentation

- Comprehensive README.md with quick start guides
- FRONTEND_TOOL_EXECUTION.md with detailed HITL implementation guide
- CLAUDE.md for development guidelines and architecture overview
- Per-package README files
- Inline code documentation and JSDoc comments

## [Unreleased]

### Planned
- Additional React hooks for advanced use cases
- WebSocket support for real-time updates
- Offline support with local caching
- More comprehensive error handling
- Additional examples and demos
- Additional framework adapters (Vue, Angular, etc.)

---

## Release Notes

### 0.1.0 - First Public Release

This is the first public release of the Agno Client libraries. The project provides a complete, production-ready solution for integrating Agno agents into JavaScript/TypeScript applications.

**Key Highlights:**
- Framework-agnostic core library with React adapter
- Full streaming support with real-time updates
- Human-in-the-Loop (HITL) frontend tool execution
- Production-ready security features
- Comprehensive TypeScript support
- Complete documentation

**Getting Started:**
```bash
npm install @antipopp/agno-react
```

See the [README.md](./README.md) for quick start guides and examples.

**Frontend Tool Execution:**
The standout feature of this release is the HITL frontend tool execution support. This allows Agno agents to delegate specific tools to the browser, enabling:
- UI automation (navigate, fill forms, click buttons)
- Browser API access (geolocation, notifications, storage)
- User confirmation flows for sensitive operations
- External integrations not accessible from the backend

See [FRONTEND_TOOL_EXECUTION.md](./FRONTEND_TOOL_EXECUTION.md) for detailed usage instructions.

**Package Versions:**
- @antipopp/agno-types: 0.1.0
- @antipopp/agno-client: 0.1.0
- @antipopp/agno-react: 0.1.0

---

## Contributing

This is an independent open-source project. Contributions are welcome! Please read the [README.md](./README.md) for development setup and guidelines.

## License

MIT License - See [LICENSE](./LICENSE) for details.
