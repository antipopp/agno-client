# Changelog

All notable changes to the Agno Client libraries will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-05

### Added

#### @antipopp/agno-react
- **ToolHandlerProvider**: New context provider for managing global tool handlers across the application
  - Allows defining tool handlers at any level of the component tree
  - Page-specific handlers automatically override global handlers when active
  - Enables navigation-aware handlers using React Router hooks
- **Enhanced useAgnoToolExecution**: Hook now consumes handlers from ToolHandlerProvider context
  - Supports both context-provided handlers and directly passed handlers
  - Merges page-specific handlers with global handlers (page-specific takes priority)
  - Maintains backward compatibility with existing usage patterns

#### Documentation
- **Pattern 4 in FRONTEND_TOOL_EXECUTION.md**: Comprehensive guide for React Router Navigation + Form Filling
  - Global tool handler pattern with React Router integration
  - React Hook Form integration for robust form state management
  - SessionStorage-based cross-page data transfer
  - Complete working examples with TypeScript
  - Architecture diagrams and best practices

#### Examples
- **SaaS App Example**: Updated to demonstrate the new ToolHandlerProvider pattern
  - GlobalToolHandlers component for app-wide navigation and data transfer
  - NewReport page with React Hook Form integration
  - AI-powered form filling that works across route navigation
  - Clean separation between global and page-specific handlers

### Changed

#### @antipopp/agno-react
- Improved tool execution flow to support hierarchical handler resolution
- Enhanced type safety for ToolHandler function signatures
- Better error handling in tool execution pipeline

## [0.1.0] - 2025-10-28

### Added

#### @antipopp/agno-types
- Initial TypeScript types for Agno API
- RunEvent types (RunStarted, RunPaused, RunContinued, etc.)
- ChatMessage and ToolCall types
- API response types (RunResponse, SessionEntry, AgentDetails)
- Configuration and state types

#### @antipopp/agno-client
- Core AgnoClient with EventEmitter pattern
- MessageStore for immutable message state management
- ConfigManager for centralized configuration
- SessionManager for session history management
- EventProcessor for processing streaming RunEvents
- StreamParser for incremental JSON parsing
- Frontend tool execution (HITL) support with continueRun() method
- Support for both agent and team modes

#### @antipopp/agno-react
- AgnoProvider component for React integration
- useAgnoClient hook for accessing client instance
- useAgnoChat hook for message management and streaming
- useAgnoSession hook for session loading/management
- useAgnoActions hook for initialization and helpers
- useAgnoToolExecution hook for frontend tool execution (HITL)
- Auto-execution and manual confirmation modes

#### Documentation
- FRONTEND_TOOL_EXECUTION.md with comprehensive HITL guide
- CLAUDE.md with development guidelines
- README files for all packages
- TypeScript examples and API reference

#### Examples
- React example with basic chat interface
- SaaS app example with AI-powered form filling
- Python backend examples with external_execution tools

### Technical Highlights
- Full TypeScript support with strict types
- Framework-agnostic core library
- React hooks adapter with clean separation
- Event-driven architecture for real-time updates
- Streaming support with incremental JSON parsing
- Session management with automatic conversion
- Tool execution with HITL pattern
- pnpm workspace monorepo structure

[0.2.0]: https://github.com/antipopp/agno-client/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/antipopp/agno-client/releases/tag/v0.1.0
