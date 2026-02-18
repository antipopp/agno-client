# Changelog

All notable changes to the Agno Client libraries will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.0] - 2026-02-18

### Added

#### @antipopp/agno-react
- **Tool Argument Validation Helpers**: Added validator-agnostic helpers for runtime tool arg validation
  - `createToolArgsValidatorFromSafeParse()` to adapt schema `safeParse` APIs
  - `createValidatedToolHandler()` to wrap handlers with validation before execution
  - Structured default validation failures (`code: "INVALID_TOOL_ARGS"`) with optional issue payloads

### Documentation
- Added runtime validation guidance and Zod examples to frontend tool execution docs
- Clarified `ToolHandler` behavior (normalized args + sync/async returns)

## [0.11.0] - 2026-02-17

### Added

#### @antipopp/agno-types
- **Global Dependencies**: Added `dependencies?: Record<string, unknown>` to `AgnoClientConfig`
- **SendMessageOptions Type**: Added and exported `SendMessageOptions` to unify request options (`headers`, `params`, `dependencies`, `files`)
- **Media/File Type Coverage**: Expanded media typing and added `FileData` for file attachments in chat messages and API responses

#### @antipopp/agno-client
- **Dependency Merge Support**: Added `getDependencies()`, `setDependencies()`, and `buildDependencies()` to `ConfigManager`
- **Dependency-Aware Requests**: `sendMessage()` now merges global and per-request `dependencies` and sends them to run endpoints
- **Per-Request File Uploads**: `sendMessage()` now accepts `files` in options and appends them as multipart `files`
- **Client-Side Stream Abort**: Added `abortStream()` to stop active streaming without calling backend cancel

### Fixed

#### @antipopp/agno-client
- **Streaming Resilience**: Wired `AbortController` into streaming flows so cancellation reliably ends active requests
- **cancelRun Hardening**: Improved behavior when canceling before run ID availability and when backend cancel returns errors
- **Continue Conflict Handling**: Preserved paused state and pending tools when continue requests are rejected (for example HTTP 409)
- **HITL Field Preservation**: Prevented backend echo updates from overwriting frontend `result` and `ui_component` values on tool calls
- **Media Attachment Persistence**: Preserved image/video/audio/file attachments across event processing and session hydration
- **Optimistic Attachment Stability**: Kept optimistic attachment previews when runtime `File` constructor identity differs

#### @antipopp/agno-react
- **Tool Execution Robustness**: Improved session UI hydration and continue flow error handling in `useAgnoToolExecution`
- **Declaration Build Compatibility**: Resolved React declaration build type issues

### Changed

#### Typing and Code Quality
- Tightened TypeScript usage across packages (`unknown`-first patterns, reduced `any`) as non-breaking type-safety polish
- Refactored parser/event handling paths to reduce complexity and improve lint compliance
- Applied lint and formatting cleanup across core, react, and examples

### Documentation
- Updated package READMEs with dependency merge behavior and file upload examples
- Added repository-level `AGENTS.md` with comprehensive guidance for agentic coding tools

### Examples
- Updated `react-chat` and `saas-app` examples for current tool typings and attachment rendering flow
- Added explicit image dimensions in chat message rendering to reduce layout shift

### Notes
- No intentional runtime breaking API changes were introduced in this release.

## [0.9.0] - 2026-01-09

### Added

#### @antipopp/agno-types
- **Global Query Parameters**: New `params` field in `AgnoClientConfig` for setting custom query parameters
  - Optional `Record<string, string>` field for defining parameters that apply to all API requests
  - Fully documented with JSDoc explaining parameter merge precedence
  - Backward compatible - existing code works without changes
- **StreamOptions Enhancement**: Added `params` field to `StreamOptions` for per-request query parameters
  - Enables per-request parameter overrides alongside existing header support
  - Consistent API across all streaming operations

#### @antipopp/agno-client
- **Centralized Query Parameter Management**: All API requests now support custom query parameters
  - New `getParams()` and `setParams()` methods in ConfigManager
  - New `buildQueryString()` method that intelligently merges parameters with proper precedence
  - Parameters applied to ALL requests: streaming (sendMessage, continueRun), session management (fetchSessions, loadSession, deleteSession), and utility methods (fetchAgents, fetchTeams, checkStatus, initialize)
  - **Parameter Merge Order** (lowest to highest precedence):
    1. Global params from `config.params`
    2. Per-request params from `options.params` (overrides global)
  - StreamParser updated to accept and apply URLSearchParams to fetch URLs
  - SessionManager methods updated to accept and merge query parameters into request URLs
  - All methods automatically construct query strings from params and append to endpoint URLs

#### @antipopp/agno-react
- **Automatic Query Parameter Support**: React hooks automatically support query parameters through config forwarding
  - `AgnoProvider` now accepts `params` in config prop
  - `updateConfig({ params: {...} })` enables dynamic parameter updates at runtime
  - All hooks forward params to core client methods:
    - `useAgnoChat.sendMessage(message, { params })` - Per-request params for message streaming
    - `useAgnoSession.loadSession(sessionId, { params })` - Per-request params for session loading
    - `useAgnoSession.fetchSessions({ params })` - Per-request params for session fetching
    - `useAgnoActions.initialize({ params })` - Per-request params for initialization
    - `useAgnoActions.checkStatus({ params })` - Per-request params for health checks
    - `useAgnoActions.fetchAgents({ params })` - Per-request params for agent listing
    - `useAgnoActions.fetchTeams({ params })` - Per-request params for team listing
    - `useAgnoToolExecution.continueWithResults(tools, { params })` - Per-request params for HITL continuation
  - No code changes required for global params - existing config synchronization handles new field

### Changed

#### @antipopp/agno-client (Internal API)
- **SessionManager Method Signatures**: Enhanced to accept `params?: URLSearchParams`
  - Affects: `fetchSessions()`, `fetchSession()`, `deleteSession()`
  - Internal change only - not exposed directly in public API
  - Enables cleaner parameter management across all session operations
  - Parameters are merged into existing URL query strings using URLSearchParams.set()
- **StreamParser**: Updated `streamResponse()` to accept `params?: URLSearchParams`
  - Parameters appended to URL before fetch call
  - Gracefully handles empty/undefined params
- **All Client Methods**: Updated to build and pass query parameters
  - Methods now construct URLSearchParams via `ConfigManager.buildQueryString()`
  - Parameters appended to URLs for GET requests (agents, teams, health, sessions)
  - Parameters appended to URLs for POST requests (runs, continue endpoints)
  - Parameters appended to URLs for DELETE requests (session deletion)

### Documentation

#### CLAUDE.md
- Added comprehensive "Custom Query Parameters" section with:
  - How params work (global vs per-request)
  - Parameter merging precedence rules
  - Complete usage examples for both core client and React
  - All supported methods with params documented
  - Key files reference with line numbers
  - Common use cases (API versioning, feature flags, locale, debugging, pagination, model configuration)
  - Practical examples showing params override behavior

#### README.md Updates
- **packages/core/README.md**:
  - Added `params` to constructor config options
  - Enhanced `sendMessage()` examples with query parameter usage
  - New "Custom Headers and Query Parameters" section with:
    - Global configuration examples
    - Per-request options examples
    - Merge behavior explanation for both headers and params
    - Common use cases for production scenarios
- **packages/react/README.md**:
  - Updated `AgnoProvider` example with params in config
  - Enhanced `sendMessage()` examples with query parameter usage
  - Updated hook examples to show params support:
    - `useAgnoSession` example with params
    - `useAgnoActions` example with params

### Technical Highlights
- **Type-Safe**: Full TypeScript support with `Record<string, string>` enforcement for params
- **Mutable**: Query parameters can be updated dynamically via `updateConfig()`
- **Centralized**: All parameter building logic in one place (`ConfigManager.buildQueryString()`)
- **Consistent**: Parameter behavior mirrors headers implementation for API consistency
- **Backward Compatible**: `params` field is optional, existing code unchanged
- **Applied Everywhere**: Consistent parameter behavior across all API operations
- **URL Safe**: Uses `URLSearchParams` for proper query string encoding

### Usage Examples

**Global Params in React:**
```typescript
<AgnoProvider
  config={{
    endpoint: 'http://localhost:7777',
    agentId: 'agent-123',
    params: {
      locale: 'en-US',
      environment: 'production',
      api_version: 'v2',
    },
  }}
>
  <App />
</AgnoProvider>
```

**Dynamic Updates:**
```typescript
const { updateConfig } = useAgnoActions();
updateConfig({
  params: { temperature: '0.7', max_tokens: '500' },
});
```

**Per-Request Override:**
```typescript
const { sendMessage } = useAgnoChat();
await sendMessage('Hello', {
  params: { debug: 'true', trace_id: 'xyz123' },
});
```

**Core Client Usage:**
```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  agentId: 'agent-123',
  params: {
    locale: 'en-US',
    version: 'v2',
  },
});

// Per-request override
await client.sendMessage('Hello', {
  params: { temperature: '0.8' } // Overrides global params
});
```

**Session Management with Params:**
```typescript
// Fetch sessions with pagination
await client.fetchSessions({ params: { limit: '50', offset: '0' } });

// Load session with metadata
await client.loadSession('session-123', { params: { include_metadata: 'true' } });
```

**Combining Headers and Params:**
```typescript
await client.sendMessage('Hello', {
  headers: { 'X-Request-ID': crypto.randomUUID() },
  params: { temperature: '0.7', debug: 'true' }
});
```

### Affected Files
- `packages/types/src/config.ts` - Added `params` field to `AgnoClientConfig` and `StreamOptions`
- `packages/core/src/managers/config-manager.ts` - Added `getParams()`, `setParams()`, and `buildQueryString()` methods
- `packages/core/src/parsers/stream-parser.ts` - Updated `streamResponse()` to accept and apply params
- `packages/core/src/managers/session-manager.ts` - Updated 3 method signatures to accept params
- `packages/core/src/client.ts` - Updated 9 methods to build and use query parameters:
  - `sendMessage()` - line 117
  - `continueRun()` - line 658
  - `loadSession()` - line 434
  - `fetchSessions()` - line 472
  - `deleteSession()` - line 504
  - `checkStatus()` - line 762
  - `fetchAgents()` - line 787
  - `fetchTeams()` - line 811
  - `initialize()` - line 836
- `packages/react/src/hooks/useAgnoChat.ts` - Updated `sendMessage()` to accept params
- `packages/react/src/hooks/useAgnoSession.ts` - Updated `loadSession()` and `fetchSessions()` to accept params
- `packages/react/src/hooks/useAgnoActions.ts` - Updated `initialize()`, `checkStatus()`, `fetchAgents()`, `fetchTeams()` to accept params
- `packages/react/src/hooks/useAgnoToolExecution.ts` - Updated `continueWithResults()` to accept params

### Migration Guide
No migration required - this is a fully backward-compatible feature addition. Existing code continues to work without changes.

To start using query parameters:
1. Add `params` to your `AgnoClientConfig` for global parameters
2. Pass `params` in options object for per-request parameters
3. Parameters automatically merge with per-request overriding global

## [0.7.0] - 2025-12-30

### Added

#### @antipopp/agno-types
- **Global Custom Headers**: New `headers` field in `AgnoClientConfig` for setting custom HTTP headers
  - Optional `Record<string, string>` field for defining headers that apply to all API requests
  - Fully documented with JSDoc explaining header merge precedence
  - Backward compatible - existing code works without changes

#### @antipopp/agno-client
- **Centralized Header Management**: All API requests now support global custom headers
  - New `getHeaders()` and `setHeaders()` methods in ConfigManager
  - New `buildRequestHeaders()` method that intelligently merges headers with proper precedence
  - Headers applied to ALL requests: streaming (sendMessage, continueRun), session management (fetchSessions, loadSession, deleteSession), and utility methods (fetchAgents, fetchTeams, checkStatus)
  - **Header Merge Order** (lowest to highest precedence):
    1. Global headers from `config.headers`
    2. Per-request headers from `options.headers`
    3. Authorization header from `authToken` (always wins)
  - SessionManager methods updated to accept pre-built headers instead of individual authToken parameter

#### @antipopp/agno-react
- **Automatic Header Support**: React hooks automatically support global headers through config forwarding
  - `AgnoProvider` now accepts `headers` in config prop
  - `updateConfig({ headers: {...} })` enables dynamic header updates at runtime
  - `useAgnoChat.sendMessage()` continues to support per-request header overrides
  - No code changes required - existing config synchronization handles new field

### Changed

#### @antipopp/agno-client (Internal API)
- **SessionManager Method Signatures**: Changed from `authToken?: string` to `headers: Record<string, string>`
  - Affects: `fetchSessions()`, `fetchSession()`, `deleteSession()`
  - Internal change only - not exposed in public API
  - Enables cleaner header management and removes duplicate authorization logic

### Technical Highlights
- **Type-Safe**: Full TypeScript support with `Record<string, string>` enforcement
- **Mutable**: Headers can be updated dynamically via `updateConfig()`
- **Centralized**: All header building logic in one place (`ConfigManager.buildRequestHeaders()`)
- **Security First**: Authorization header from `authToken` always takes precedence
- **Backward Compatible**: `headers` field is optional, existing code unchanged
- **Applied Everywhere**: Consistent header behavior across all API operations

### Usage Examples

**Global Headers in React:**
```typescript
<AgnoProvider
  config={{
    endpoint: 'http://localhost:7777',
    agentId: 'agent-123',
    headers: {
      'X-API-Key': 'my-api-key',
      'X-Custom-Header': 'value',
    },
  }}
>
  <App />
</AgnoProvider>
```

**Dynamic Updates:**
```typescript
const { updateConfig } = useAgnoActions();
updateConfig({
  headers: { 'X-API-Key': 'new-key' },
});
```

**Per-Request Override:**
```typescript
const { sendMessage } = useAgnoChat();
await sendMessage('Hello', {
  headers: { 'X-Request-ID': crypto.randomUUID() },
});
```

**Core Client Usage:**
```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  agentId: 'agent-123',
  headers: {
    'X-API-Key': 'my-api-key',
  },
});
```

### Affected Files
- `packages/types/src/config.ts` - Added `headers` field to `AgnoClientConfig`
- `packages/core/src/managers/config-manager.ts` - Added header management methods
- `packages/core/src/client.ts` - Updated 8 methods to use centralized header builder
- `packages/core/src/managers/session-manager.ts` - Updated 3 method signatures

## [0.6.0] - 2025-11-26

### Breaking Changes

#### @antipopp/agno-client
- **Team HITL Removed**: Teams no longer support HITL (Human-in-the-Loop) frontend tool execution
  - `continueRun()` now throws an error when called with `mode: 'team'`
  - Error message: "HITL (Human-in-the-Loop) frontend tool execution is not supported for teams. Only agents support the continue endpoint."
  - Reason: AgentOS API does not provide a `/teams/{id}/runs/{runId}/continue` endpoint
  - Location: `packages/core/src/client.ts:574-607`
  - **Migration**: If you need frontend tool execution, use agent mode instead of team mode

#### @antipopp/agno-react
- **useAgnoToolExecution**: Hook now logs warning and no-ops when used with team mode
  - Prevents event listeners from being registered for teams
  - Console warning: "HITL (Human-in-the-Loop) frontend tool execution is not supported for teams..."
  - Location: `packages/react/src/hooks/useAgnoToolExecution.ts:147-205`
  - **Migration**: Use this hook only with agents, not teams

### Removed

#### @antipopp/agno-client (Session Manager)
- **deleteTeamSession()**: Removed deprecated method for team session deletion
  - The unified `deleteSession()` method now handles both agents and teams
  - Uses the standard `/sessions/{id}` endpoint with `db_id` query parameter
  - **Migration**: Use `deleteSession(sessionId)` instead of `deleteTeamSession(teamId, sessionId)`

### Fixed

#### @antipopp/agno-client (Session Manager)
- **Team Session Deletion**: Fixed broken endpoint with double-slash typo
  - Previous URL: `DELETE /v1//teams/{teamId}/sessions/{sessionId}` (with double slashes)
  - New URL: `DELETE /sessions/{sessionId}?db_id={dbId}` (unified endpoint)
  - Now consistent with agent session deletion
  - Location: `packages/core/src/managers/session-manager.ts`

### Documentation

#### CLAUDE.md
- Removed unsupported `/teams/{id}/runs/{runId}/continue` endpoint from API list
- Removed broken `/v1//teams/{teamId}/sessions/{sessionId}` endpoint
- Added warning: "Teams do not support the `/continue` endpoint. HITL is only available for agents."
- Updated session deletion documentation to reflect unified approach

#### FRONTEND_TOOL_EXECUTION.md
- Added prominent warning: "Frontend tool execution (HITL) is **only supported for agents**, not teams"
- Clarified that `continueRun()` and `useAgnoToolExecution` will error with team mode

### API Compatibility

All endpoints now align with AgentOS OpenAPI specification:
- ✅ `GET /health` - Health check
- ✅ `GET /agents` - List agents
- ✅ `GET /teams` - List teams
- ✅ `POST /agents/{id}/runs` - Run agent (streaming)
- ✅ `POST /teams/{id}/runs` - Run team (streaming)
- ✅ `POST /agents/{id}/runs/{runId}/continue` - Continue paused agent run (agent only)
- ✅ `GET /sessions` - List sessions
- ✅ `GET /sessions/{id}/runs` - Get session history
- ✅ `DELETE /sessions/{id}` - Delete session (unified for agents and teams)

### Technical Details

**Build & Test:**
- ✅ All packages build successfully
- ✅ All TypeScript type checks pass
- ✅ No unintended breaking changes to public API

**Affected Files:**
- `packages/core/src/client.ts` - Added team mode validation to `continueRun()`
- `packages/core/src/managers/session-manager.ts` - Removed `deleteTeamSession()`, fixed endpoint
- `packages/react/src/hooks/useAgnoToolExecution.ts` - Added team mode validation and warnings
- `CLAUDE.md` - Updated endpoint documentation
- `FRONTEND_TOOL_EXECUTION.md` - Added agent-only warnings

## [0.5.1] - 2025-11-11

### Fixed

#### @antipopp/agno-react
- **AgnoProvider config synchronization**: Fixed critical issue where config updates (especially `userId`) were not synced to the client instance

## [0.5.0] - 2025-11-10

### Fixed

#### @antipopp/agno-react
- **createSmartChart()**: Fixed `preferredType` option being ignored during chart type selection
  - The function now respects explicit `preferredType` setting (bar, line, area, pie) before auto-detection
  - Previously, auto-detection logic could override the user's explicit preference
  - Improved auto-detection logic to only trigger when no preferred type is specified
  - Location: `packages/react/src/utils/ui-helpers.ts:363`

### Technical Details
- When `options.preferredType` is provided, the function now immediately creates the requested chart type
- Auto-detection based on data characteristics (pie for single value, line for temporal data) only runs when no preference is set
- Ensures predictable behavior when developers explicitly specify chart type

## [0.4.0] - 2025-11-10

### Added

#### @antipopp/agno-types
- **User ID Support**: New `userId` field in `AgnoClientConfig` for linking sessions to specific users
  - Optional string field to track which user is interacting with the agent
  - Matches official Agno API's `user_id` parameter specification

#### @antipopp/agno-client
- **User ID Tracking**: Automatic inclusion of `user_id` in API requests
  - `sendMessage()` now includes `user_id` in FormData when configured
  - `continueRun()` now includes `user_id` in FormData when continuing paused runs
  - New `getUserId()` and `setUserId()` methods in ConfigManager
  - Seamless integration with backend user tracking

#### Documentation
- **CLAUDE.md**: Added comprehensive User ID Tracking section
  - How it works explanation
  - Usage examples for core client and React
  - Key files reference
- **README updates**: Added userId usage examples across package documentation

### Technical Highlights
- Full backward compatibility - userId is optional
- Automatically included in all agent/team run requests when configured
- Can be set at initialization or updated dynamically via `updateConfig()`
- Works with both agent and team modes
- Supports HITL frontend tool execution with user context

## [0.3.0] - 2025-11-07

### Added

#### @antipopp/agno-types
- **UI Component Types**: New comprehensive type system for generative UI
  - `UIComponentSpec` - Base type for all UI components
  - `ChartComponentSpec` - Bar, Line, Area, and Pie chart specifications
  - `CardGridComponentSpec` - Card grid with responsive columns and actions
  - `TableComponentSpec` - Table with sortable columns and formatting
  - `CustomComponentSpec` - Support for custom render functions
  - `ToolHandlerResult` - Enhanced tool handler return type with data and UI
- **Chart Helper Types**: Detailed types for chart configuration, legends, axes, and data series

#### @antipopp/agno-react
- **Generative UI System**: Complete agent-driven UI generation framework
  - `GenerativeUIRenderer` - Main renderer component for UI specs
  - Component registry system for dynamic component lookup
  - Error boundary integration for robust rendering
- **Chart Renderers**: Four production-ready chart components with export functionality
  - `BarChartRenderer` - Vertical bar charts with rounded corners
  - `LineChartRenderer` - Line charts with monotone curves
  - `AreaChartRenderer` - Filled area charts with opacity
  - `PieChartRenderer` - Pie charts with color cells
  - **Export Menu**: Dropdown menu with "Download CSV" and "Save as Image" (PNG) options
  - Automatic filename generation with timestamps
  - Menu hidden during image capture for clean exports
- **UI Helper Functions**: Convenient functions for creating UI specifications
  - `createBarChart()`, `createLineChart()`, `createPieChart()`, `createAreaChart()` - Manual chart creation
  - `createSmartChart()` - Auto-detects best chart type based on data structure
  - `resultWithBarChart()`, `resultWithSmartChart()` - Quick result helpers that return `ToolHandlerResult`
  - `resultWithCardGrid()`, `resultWithTable()` - Grid and table helpers
  - `createCard()`, `createColumn()` - Component builders
  - `createToolResult()` - Manual wrapper for UI specs
- **Custom Render Support**: Runtime registry for React component render functions
  - `registerCustomRender()` - Store custom render functions
  - `getCustomRender()` - Retrieve custom renders by key
  - Automatic cleanup of non-serializable functions

#### @antipopp/agno-client
- **UI Hydration System**: Attaches UI components to tool calls in messages
  - `hydrateToolCallUI()` - Attach UI spec to specific tool call
  - `addToolCallsToLastMessage()` - Add frontend-executed tool calls to messages
  - Pending UI specs mechanism for handling timing issues during streaming
  - `applyPendingUISpecs()` - Automatic application when tool calls arrive
- **Enhanced Message Store**: New methods for precise message updates
  - `updateMessage()` - Update specific message by index
  - Immutable update pattern maintained
- **Improved Event Processing**: Better handling of tool calls and UI components
  - Tool calls stored directly in message `tool_calls` array with `ui_component` property
  - Session manager converts backend format to frontend format
  - UI components persist across page refreshes (serializable specs only)

#### Documentation
- **Comprehensive FRONTEND_TOOL_EXECUTION.md Rewrite**:
  - Combined HITL and Generative UI documentation into single guide
  - Clear how-to focus (removed development history)
  - Complete API reference for all helper functions
  - Chart types, card grids, and table examples
  - Advanced patterns: Agent-driven chart selection, multi-step execution
  - Troubleshooting section with common issues
  - TypeScript types reference
- **Updated README.md**:
  - Added Generative UI feature section
  - Updated documentation links
  - Highlighted interactive charts with export functionality

#### Examples
- **React Chat Example**: Complete generative UI implementation
  - Chart renderers with Recharts integration
  - Card grid and table renderers (planned)
  - Component registration in app setup
  - Example tool handlers with generative UI
  - Cleanup of unused AI Elements components (removed 23 unused files)

### Changed

#### @antipopp/agno-react
- **useAgnoToolExecution**: Enhanced to support UI component generation
  - `processToolResult()` now exported for use in session hydration
  - Handles three result formats: `ToolHandlerResult`, direct UI spec, and legacy plain data
  - Custom render functions registered at runtime
  - Session hydration moved from `useAgnoChat` to ensure handlers are available
- **useAgnoChat**: Simplified by removing hydration logic
  - Kept UI render event handler for real-time updates
  - Cleaner separation of concerns

#### @antipopp/agno-types
- **Message Types**: Removed deprecated fields
  - Removed `generated_ui` from `MessageExtraData`
  - Removed `external_execution_tools` tracking
  - Simplified to single source of truth (tool_calls)

#### Architecture
- **Tool Calls as Single Source of Truth**: UI components stored directly in `tool_calls` array
  - `ui_component` property added to tool calls
  - No separate storage for generated UI
  - Cleaner data model and better persistence

### Fixed
- **UI Timing Issues**: Pending UI specs mechanism prevents race conditions
  - Frontend can attach UI before backend finishes streaming tool calls
  - UI automatically applied when tool calls arrive
- **Session Reload**: UI components properly regenerated on page refresh
  - Tool handlers available during session load
  - Custom renders excluded (not serializable)
  - Chart data properly hydrated

### Dependencies
- **html2canvas** (^1.4.1): Added to React example for chart image export

### Technical Highlights
- Agent-driven UI generation with flexible component system
- Interactive charts with CSV and PNG export functionality
- Runtime component registry for dynamic rendering
- Serializable UI specifications for persistence
- Error boundaries for robust rendering
- Type-safe UI helper functions with full TypeScript support
- Integration with shadcn/ui and Recharts libraries
- Responsive design with Tailwind CSS

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

[0.12.0]: https://github.com/antipopp/agno-client/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/antipopp/agno-client/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/antipopp/agno-client/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/antipopp/agno-client/compare/v0.8.0...v0.9.0
[0.7.0]: https://github.com/antipopp/agno-client/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/antipopp/agno-client/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/antipopp/agno-client/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/antipopp/agno-client/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/antipopp/agno-client/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/antipopp/agno-client/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/antipopp/agno-client/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/antipopp/agno-client/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/antipopp/agno-client/releases/tag/v0.1.0
