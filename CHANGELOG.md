# Changelog

All notable changes to the Agno Client libraries will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.5.1]: https://github.com/antipopp/agno-client/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/antipopp/agno-client/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/antipopp/agno-client/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/antipopp/agno-client/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/antipopp/agno-client/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/antipopp/agno-client/releases/tag/v0.1.0
