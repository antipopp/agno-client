# SaaS App with AI Copilot

A modern SaaS application with an AI-powered copilot that helps users create reports through natural conversation and frontend tool execution.

## Features

- **Dashboard**: Analytics overview with revenue metrics and data tables
- **Reports Management**: View and manage reports
- **AI-Assisted Report Creation**: Create reports with AI help through the sidebar copilot
- **Frontend Tool Execution**: AI can directly fill form fields based on conversation
- **Real-time Streaming**: Live updates from the AI agent

## Project Structure

```
examples/saas-app/
├── src/
│   ├── components/
│   │   ├── ai-elements/      # AI UI components (conversation, message, etc.)
│   │   ├── chat/              # Chat components (AICopilot, ChatInput, MessageItem)
│   │   └── ui/                # shadcn UI components
│   ├── layouts/
│   │   └── AppLayout.tsx      # Main layout with nav and sidebar
│   ├── pages/
│   │   ├── Dashboard.tsx      # Analytics dashboard
│   │   ├── Reports.tsx        # Reports list
│   │   └── NewReport.tsx      # Report creation form with AI tool integration
│   ├── App.tsx                # Router setup
│   └── main.tsx               # Root component with AgnoProvider
├── agent_config.py            # Backend agent configuration (Python)
└── AGENT_CONFIGURATION.md     # Detailed agent setup guide
```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.8+ with Agno installed (for the backend agent)

### 1. Frontend Setup

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start the development server
cd examples/saas-app
pnpm dev
```

The app will be available at `http://localhost:3001` (or another port if 3001 is in use).

### 2. Backend Agent Setup

Install Agno if you haven't already:

```bash
pip install agno
```

Run the agent:

```bash
# From examples/saas-app directory
python agent_config.py
```

The agent will start at `https://localhost:7777` with ID `demo-saas-agent`.

### 3. Using the App

1. **Chat with the AI** from any page (sidebar on the right)
2. **Ask the AI to create a report**, for example:
   - "I need to create a financial report for Q1 2025"
   - "Help me create a monthly sales report"
   - "Create a customer satisfaction report for last quarter"

3. **Watch the AI navigate to the form and fill it** automatically!
   - From Dashboard: AI navigates to `/reports/new` and fills the form
   - From Reports page: AI navigates to `/reports/new` and fills the form
   - From New Report page: AI fills the form directly

4. **The tool works from anywhere** - no need to be on the form page first!

## Frontend Tool Execution

This app demonstrates **Human-in-the-Loop (HITL)** frontend tool execution with **global tool handler registry**, where the AI agent can execute tools from any page in the browser.

### How It Works

1. **User asks AI for help** from any page (e.g., "Create a Q1 financial report")
2. **AI gathers information** through conversation
3. **AI calls `fill_report_form` tool** with the gathered data
4. **Backend emits RunPaused event** with tool execution request
5. **Global handler intercepts** the request (works from any page!)
6. **If not on form page**: Navigates to `/reports/new` and stores data in sessionStorage
7. **Form page loads**: Picks up data from sessionStorage and applies it
8. **If already on form page**: Updates form directly
9. **Frontend sends results back** to continue the agent run
10. **AI confirms completion** and provides feedback

### Global Tool Handler (main.tsx:10-33)

The `fill_report_form` handler is registered globally, making it available from any page:

```typescript
const globalToolHandlers: Record<string, ToolHandler> = {
  fill_report_form: async (args) => {
    // Store data for the form page
    sessionStorage.setItem('pendingReportData', JSON.stringify(args))

    // Navigate if not already on form page
    if (!window.location.pathname.includes('/reports/new')) {
      window.location.href = '/reports/new'
      return { success: true, message: 'Navigating to report form...' }
    }

    return { success: true, message: 'Form data ready' }
  }
}

<ToolHandlerProvider handlers={globalToolHandlers}>
  <AgnoProvider>
    <App />
  </AgnoProvider>
</ToolHandlerProvider>
```

### Page-Specific Handler (NewReport.tsx:55-83)

The form page can override with a local handler for direct updates:

```typescript
// Check for pending data on mount
useEffect(() => {
  const pendingData = sessionStorage.getItem('pendingReportData')
  if (pendingData) {
    setFormData(JSON.parse(pendingData))
    sessionStorage.removeItem('pendingReportData')
  }
}, [])

// Local handler overrides global when on this page
const toolHandlers = {
  fill_report_form: async (args) => {
    setFormData(prev => ({ ...prev, ...args }))
    return { success: true }
  }
}

useAgnoToolExecution(toolHandlers, true)
```

**Backend (agent_config.py:11-32):**
```python
@tool(external_execution=True)
def fill_report_form(
    name: str = None,
    description: str = None,
    category: str = None,
    start_date: str = None,
    end_date: str = None,
) -> str:
    """Fill the report form with the provided details."""
    return "Form will be filled on the frontend"
```

## Configuration

### Agno Agent Endpoint

The frontend connects to the agent at:
- **Endpoint**: `https://localhost:7777`
- **Agent ID**: `demo-saas-agent`

To change this, edit `src/main.tsx:10-13`:

```typescript
<AgnoProvider
  config={{
    endpoint: 'https://your-endpoint.com',
    mode: 'agent',
    agentId: 'your-agent-id',
  }}
>
```

### Available Categories

The report form supports these categories:
- `financial` - Financial reports
- `sales` - Sales reports
- `marketing` - Marketing reports
- `customer` - Customer reports
- `product` - Product reports

### Date Format

Dates should be in JavaScript `toDateString()` format:
- Format: `"Day Mon DD YYYY"`
- Example: `"Mon Jan 01 2025"`

## Example Conversations

### Complete Report Creation

**User:** "I need to create a financial report for Q1 2025"

**AI:** "I'll help you create a financial report for Q1 2025. Let me fill in the form for you."

*AI calls tool and form is automatically filled:*
- **Name**: "Q1 2025 Financial Report"
- **Description**: "Quarterly financial analysis for Q1 2025"
- **Category**: "financial"
- **Start Date**: Jan 1, 2025
- **End Date**: Mar 31, 2025

**AI:** "I've filled in the form with details for a Q1 2025 financial report. Feel free to modify any fields before submitting!"

### Guided Creation

**User:** "Help me create a report"

**AI:** "I'd be happy to help! What type of report are you looking to create?"

**User:** "Marketing report for last month"

**AI:** "Perfect! Let me set that up for you."

*Form is filled automatically with appropriate values*

## Architecture

### Global Tool Handler Registry

This app uses a **new pattern** for context-aware frontend tools:

```
ToolHandlerProvider (global handlers)
  └── AgnoProvider (client instance)
      └── AppLayout (nav + sidebar)
          ├── AICopilot (chat - works from any page)
          ├── Dashboard (no local handlers)
          ├── Reports (no local handlers)
          └── NewReport (local handlers override global)
```

**Key Benefits:**
- Tools work from any page (not just where handlers are defined)
- Global handlers provide fallback behavior (navigate + store data)
- Page-specific handlers override globals for direct manipulation
- Seamless UX: AI can help from anywhere in the app

### State Management

- **Agno Client**: Manages agent connection and message streaming
- **ToolHandlerProvider**: Global tool handler registry (new!)
- **React Hooks**: `useAgnoChat()` for messages, `useAgnoToolExecution()` for tools
- **SessionStorage**: Cross-page data transfer for navigation flows
- **Local State**: Form data managed with React `useState`

### Tool Execution Flow

```
User Message → Agent Processing → Tool Call Decision
                                        ↓
                                  RunPaused Event
                                        ↓
                            Frontend Intercepts (useAgnoToolExecution)
                                        ↓
                            Execute Tool Handler (fill form)
                                        ↓
                        Return Results → client.continueRun()
                                        ↓
                            Backend Continues Processing
                                        ↓
                            Agent Provides Confirmation
```

### Security Considerations

- Only safe, non-destructive operations exposed as frontend tools
- All tool arguments validated before use
- Auto-execution enabled for convenience (can be disabled)
- Manual confirmation can be required for sensitive operations

## Development

### Building

```bash
pnpm build
```

### Type Checking

```bash
pnpm typecheck
```

### Adding New Tools

1. **Define backend tool** in `agent_config.py` with `external_execution=True`
2. **Add frontend handler** in the appropriate component:
   ```typescript
   const toolHandlers = {
     your_tool_name: async (args) => {
       // Implementation
       return { success: true, result: ... }
     }
   }
   ```
3. **Use the hook**: `useAgnoToolExecution(toolHandlers, true)`

## Troubleshooting

### Agent Not Responding

- Ensure the agent is running at `https://localhost:7777`
- Check browser console for connection errors
- Verify the agent ID matches (`demo-saas-agent`)

### Tool Not Executing

- Confirm `external_execution=True` on the backend tool
- Check browser console for `[useAgnoToolExecution]` logs
- Verify tool name matches between frontend and backend

### Form Not Filling

- Check that category is one of the valid values
- Verify date format matches `toDateString()` format
- Look for errors in browser console

## Learn More

- [Agno Documentation](https://docs.agno.com)
- [Frontend Tool Execution Guide](../../FRONTEND_TOOL_EXECUTION.md)
- [Agent Configuration](./AGENT_CONFIGURATION.md)
- [Agno Client Architecture](../../CLAUDE.md)

## License

This example is part of the Agno client libraries monorepo and follows the same license.
