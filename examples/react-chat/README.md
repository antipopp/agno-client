# Agno React Chat Example

A comprehensive single-page chat application demonstrating all features of the `@antipopp/agno-react` library with a modern UI built using shadcn/ui components.

## Features

This example application demonstrates:

### Core Features
- ✅ **Real-time message streaming** with live updates
- ✅ **Agent/Team configuration** with dynamic endpoint management
- ✅ **Session management** (create, load, and switch between sessions)
- ✅ **Tool call execution** with detailed display of arguments and results
- ✅ **Reasoning steps** visualization
- ✅ **Media support** (images, videos, audio)
- ✅ **RAG references** display
- ✅ **Error handling** with user-friendly notifications

### React Hooks Demonstrated
- `useAgnoChat()` - Message management and streaming
- `useAgnoSession()` - Session loading and management
- `useAgnoActions()` - Initialization and configuration
- `useAgnoClient()` - Direct client access for advanced features

### UI Components
- **Chat Interface** - Clean message display with role-based styling
- **Configuration Panel** - Endpoint, auth, mode, and entity configuration
- **Session Sidebar** - Browse and load previous conversations
- **State Inspector** - Debug panel for real-time state and event monitoring
- **Responsive Layout** - Collapsible sidebars for optimal screen usage

## Setup

### Prerequisites

Make sure you have the following installed:
- Node.js 18+
- pnpm 8+
- An Agno instance running (default: `http://localhost:7777`)

### Installation

From the repository root:

```bash
# Install all dependencies
pnpm install

# Build the library packages (required before running the example)
pnpm build

# Navigate to the example directory
cd examples/react-chat

# Install example dependencies (if not already installed)
pnpm install
```

### Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and configure your Agno connection:

```env
# Agno endpoint URL (default: http://localhost:7777)
VITE_AGNO_ENDPOINT=http://localhost:7777

# Optional: Authentication token for Agno API
VITE_AGNO_AUTH_TOKEN=

# Optional: Default mode (agent or team)
VITE_AGNO_MODE=agent

# Optional: Default agent ID
VITE_AGNO_AGENT_ID=

# Optional: Default team ID
VITE_AGNO_TEAM_ID=

# Optional: Database ID
VITE_AGNO_DB_ID=
```

**Note:** All configuration options can also be changed in the UI at runtime.

## Running the Example

```bash
# From examples/react-chat directory
pnpm dev
```

The application will open at `http://localhost:3000`.

## Usage Guide

### 1. Initialize the Connection

1. Click the **Settings** icon (gear) in the top-right corner
2. Verify the endpoint URL is correct
3. Click **Initialize** to connect to Agno and fetch available agents/teams
4. Check the "Endpoint Status" badge turns green
5. **The first available agent/team will be automatically selected** with its database ID

### 2. Configure Agent/Team (Optional)

If you want to change the auto-selected agent/team:

1. In the Configuration Panel, select **Mode** (Agent or Team)
2. Choose a different agent or team from the dropdown
3. Click **Apply Config**

### 3. Start Chatting

1. Type your message in the input box at the bottom
2. Press **Enter** or click the **Send** button
3. Watch as the agent responds in real-time with streaming updates

### 4. Manage Sessions

1. Click **New Chat** in the Sessions sidebar to start a fresh conversation
2. Click **Refresh** to load all available sessions
3. Click on any session to load its message history

### 5. Explore Advanced Features

- **Tool Calls**: Expand accordion items to see tool execution details
- **Reasoning Steps**: View the agent's thought process (if available)
- **References**: See RAG context sources
- **Media**: Images, videos, and audio are displayed inline
- **Debug Panel**: Monitor state changes and events in real-time

## Project Structure

```
examples/react-chat/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx      # Main chat container
│   │   │   ├── MessageList.tsx        # Scrollable message display
│   │   │   ├── MessageItem.tsx        # Individual message with features
│   │   │   ├── PromptInput.tsx        # Text input with send button
│   │   │   └── StreamingIndicator.tsx # Loading indicator
│   │   ├── config/
│   │   │   └── ConfigPanel.tsx        # Configuration UI
│   │   ├── sessions/
│   │   │   └── SessionSidebar.tsx     # Session list and management
│   │   ├── debug/
│   │   │   └── StateInspector.tsx     # Debug/monitoring panel
│   │   └── ui/                        # shadcn components
│   ├── lib/
│   │   └── utils.ts                   # Utility functions
│   ├── styles/
│   │   └── globals.css                # Tailwind styles
│   ├── App.tsx                        # Main app layout
│   └── main.tsx                       # Entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Building for Production

```bash
# From examples/react-chat directory
pnpm build

# Preview the production build
pnpm preview
```

The optimized build will be in the `dist/` directory.

## Troubleshooting

### Endpoint Connection Issues

- Ensure your Agno instance is running
- Check the endpoint URL in settings matches your Agno server
- Verify network connectivity: `curl http://localhost:7777/v1/status`

### No Agents/Teams Available

- Click **Initialize** in the Configuration Panel
- Check the Agno server logs for errors
- Verify your Agno instance has agents or teams configured

### Streaming Not Working

- Check the browser console for errors
- Verify the selected agent/team ID is valid
- Ensure the Agno endpoint supports streaming responses

### Session Loading Fails

- Ensure you have an active agent/team configured
- Check that the session ID exists on the Agno server
- Verify authentication token (if required)

## Development

### Running with Library Development Mode

To develop the library and example simultaneously:

```bash
# Terminal 1: Watch library changes (from repo root)
pnpm dev

# Terminal 2: Run example with hot reload
cd examples/react-chat
pnpm dev
```

Changes to the library packages will automatically rebuild and hot-reload in the example.

### Adding Components

shadcn components are configured in `components.json`. To add more:

```bash
pnpm dlx shadcn@latest add [component-name]
```

## License

MIT

## Related

- [Agno Documentation](https://docs.agno.ai)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [@antipopp/agno-client](../../packages/core)
- [@antipopp/agno-react](../../packages/react)
- [@antipopp/agno-types](../../packages/types)
