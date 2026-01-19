# Agno Client Cookbooks

A progressive learning path for the Agno client libraries. Each cookbook builds on previous concepts, providing complete, working examples for both the Core client and React adapter.

## Learning Path

### Getting Started

| Cookbook | Topics | Prerequisites |
|----------|--------|---------------|
| [01. Getting Started](./01_getting_started.md) | Installation, first message, basic setup | None |
| [02. Configuration](./02_configuration.md) | Endpoint, auth, mode, userId, dbId | 01 |
| [03. Sending Messages](./03_sending_messages.md) | Message sending, streaming, cancellation | 01, 02 |
| [04. Handling Responses](./04_handling_responses.md) | ChatMessage structure, tool calls, reasoning | 01-03 |
| [05. Session Management](./05_session_management.md) | Load, list, delete sessions | 01-04 |

### React Integration

| Cookbook | Topics | Prerequisites |
|----------|--------|---------------|
| [06. React Basics](./06_react_basics.md) | AgnoProvider, hooks overview | 01-05 |
| [07. React Chat UI](./07_react_chat_ui.md) | Complete chat interface | 06 |

### Frontend Tool Execution (HITL)

| Cookbook | Topics | Prerequisites |
|----------|--------|---------------|
| [08. Tool Execution Basics](./08_tool_execution_basics.md) | HITL concept, auto-execution | 01-07 |
| [09. Tool Execution Advanced](./09_tool_execution_advanced.md) | Manual approval, global handlers | 08 |

### Generative UI

| Cookbook | Topics | Prerequisites |
|----------|--------|---------------|
| [10. Generative UI: Charts](./10_generative_ui_charts.md) | Bar, line, pie, area charts | 08 |
| [11. Generative UI: Components](./11_generative_ui_components.md) | Cards, tables, custom renders | 10 |

### Advanced Topics

| Cookbook | Topics | Prerequisites |
|----------|--------|---------------|
| [12. State and Events](./12_state_and_events.md) | ClientState, event listeners | 01-05 |
| [13. Custom Params & Headers](./13_custom_params_headers.md) | Query params, custom headers | 01-05 |
| [14. Media Handling](./14_media_handling.md) | Images, video, audio | 01-05 |
| [15. Error Handling](./15_error_handling.md) | Error recovery, debugging | 01-05 |
| [16. Production Tips](./16_production_tips.md) | Security, performance, best practices | All |

## Packages

These cookbooks cover three packages:

- **`@antipopp/agno-types`** - TypeScript types matching the Agno API
- **`@antipopp/agno-client`** - Core stateful client with streaming support
- **`@antipopp/agno-react`** - React hooks adapter

## Installation

```bash
# Using npm
npm install @antipopp/agno-client @antipopp/agno-react

# Using pnpm
pnpm add @antipopp/agno-client @antipopp/agno-react

# Using yarn
yarn add @antipopp/agno-client @antipopp/agno-react
```

## Prerequisites

- An Agno endpoint running (default: `http://localhost:7777`)
- Node.js 18+ or a modern browser environment
- TypeScript 5.0+ (recommended)

## Quick Start

Jump straight to [01. Getting Started](./01_getting_started.md) to send your first message in under 5 minutes.

## Cookbook Format

Each cookbook follows a consistent structure:

1. **Prerequisites** - What you need to know before starting
2. **Overview** - What you'll learn
3. **Core Client** - Examples using `@antipopp/agno-client` directly
4. **React** - Examples using `@antipopp/agno-react` hooks
5. **Key Points** - Important takeaways
6. **Next Steps** - Where to go next
