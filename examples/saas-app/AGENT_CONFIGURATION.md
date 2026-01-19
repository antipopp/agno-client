# SaaS Report Assistant Agent Configuration

This document provides the backend agent configuration for the SaaS app's Report Assistant feature.

## Agent Overview

The **Report Assistant** agent helps users create reports by understanding their requirements and automatically filling form fields through frontend tool execution.

## Agent Setup

### 1. Basic Configuration

```python
from agno import Agent

report_assistant = Agent(
    name="demo-saas-agent",
    description="An AI assistant that helps users create and manage reports in a SaaS application",
    instructions=[
        "You are a helpful report assistant for a SaaS analytics platform.",
        "Help users create reports by understanding their requirements.",
        "Use the fill_report_form tool to automatically populate form fields.",
        "Be conversational and ask clarifying questions when needed.",
        "Suggest appropriate categories and date ranges based on the report context.",
    ],
    markdown=True,
)
```

### 2. Frontend Tool Definition

Add the following tool to enable frontend form filling:

```python
from agno.tools import tool

@tool(external_execution=True)
def fill_report_form(
    name: str = None,
    description: str = None,
    category: str = None,
    start_date: str = None,
    end_date: str = None,
) -> str:
    """
    Fill the report form with the provided details.
    This tool is executed on the frontend and will populate the form fields.

    Args:
        name: The name of the report (optional)
        description: A brief description of the report (optional)
        category: Report category - must be one of: financial, sales, marketing, customer, product (optional)
        start_date: Start date for the report in format 'Mon Jan 01 2025' (optional)
        end_date: End date for the report in format 'Mon Jan 31 2025' (optional)

    Returns:
        Success message with filled fields
    """
    # This function body is never executed on the backend
    # The frontend will handle the actual execution
    return "Form will be filled on the frontend"

# Add tool to agent
report_assistant.tools = [fill_report_form]
```

### 3. Valid Category Values

The frontend form accepts the following category values:
- `financial` - Financial reports
- `sales` - Sales reports
- `marketing` - Marketing reports
- `customer` - Customer reports
- `product` - Product reports

### 4. Date Format

Dates should be provided in JavaScript's `toDateString()` format:
- Format: `"Day Mon DD YYYY"`
- Examples:
  - `"Mon Jan 01 2025"`
  - `"Fri Dec 31 2024"`
  - `"Wed Mar 15 2025"`

## Example Conversations

### Example 1: Complete Report Creation

**User:** "I need to create a financial report for Q1 2025"

**Agent:** "I'll help you create a financial report for Q1 2025. Let me fill in the form for you."

*Agent calls `fill_report_form`:*
```python
{
    "name": "Q1 2025 Financial Report",
    "description": "Quarterly financial analysis for Q1 2025",
    "category": "financial",
    "start_date": "Wed Jan 01 2025",
    "end_date": "Fri Mar 31 2025"
}
```

**Agent:** "I've filled in the form with details for a Q1 2025 financial report. The report covers January 1 to March 31, 2025. Feel free to modify any fields before submitting!"

### Example 2: Partial Information

**User:** "Create a sales report"

**Agent:** "I'd be happy to help you create a sales report! Could you tell me:
1. What time period should this cover?
2. What would you like to name this report?"

**User:** "Last month's data, call it Monthly Sales Summary"

**Agent:** "Perfect! Let me fill that in for you."

*Agent calls `fill_report_form`:*
```python
{
    "name": "Monthly Sales Summary",
    "description": "Sales performance analysis for the previous month",
    "category": "sales",
    "start_date": "Sat Dec 01 2024",
    "end_date": "Tue Dec 31 2024"
}
```

### Example 3: Guided Creation

**User:** "Help me create a report"

**Agent:** "I'd be happy to help! What type of report are you looking to create? We support:
- Financial reports
- Sales reports
- Marketing reports
- Customer reports
- Product reports"

**User:** "Marketing"

**Agent:** "Great choice! For your marketing report:
1. What time period should it cover?
2. Is there a specific focus or campaign you'd like to analyze?"

## Running the Agent

### Local Development

```python
from agno import Agent
from agno.os import AgentOS

# Create agent with configuration above
report_assistant = Agent(...)

# Run the agent OS
agent_os = AgentOS(
    id="demo-saas-agent",
    description="My first AgentOS",
    agents=[report_assistant],
)

if __name__ == "__main__":
    agent_os.serve(app="main:app", reload=True)
```

### Using with the Frontend

The frontend is configured to connect to:
- **Endpoint:** `http://localhost:7777`
- **Agent ID:** `demo-saas-agent`

Make sure your agent is running and accessible at this endpoint.

## Frontend Integration Details

The frontend implements the `fill_report_form` tool handler in the `NewReport` component:

```typescript
const toolHandlers: Record<string, ToolHandler> = {
  fill_report_form: async (args: Record<string, any>) => {
    // Updates form state with provided values
    // Returns success confirmation
  }
}
```

### Tool Execution Flow

1. User asks agent to fill report form (via chat in sidebar)
2. Agent analyzes request and gathers information
3. Agent calls `fill_report_form` with appropriate parameters
4. Backend emits `RunPaused` event with tool details
5. Frontend `useAgnoToolExecution` hook intercepts the call
6. Frontend executes the tool handler (updates form fields)
7. Frontend calls `client.continueRun()` with results
8. Agent receives results and confirms completion

## Best Practices

1. **Always validate category values** - Only use the five valid categories
2. **Use consistent date format** - Follow the `toDateString()` format
3. **Ask clarifying questions** - Get enough context before filling the form
4. **Confirm with user** - Let users know what you've filled in
5. **Handle partial updates** - Users can update individual fields
6. **Be conversational** - Make the interaction feel natural

## Troubleshooting

### Tool Not Executing

- Ensure `external_execution=True` is set on the tool
- Verify agent is running at the correct endpoint
- Check browser console for frontend errors

### Wrong Date Format

- Use JavaScript's `toDateString()` format exactly
- Example: `new Date(2025, 0, 1).toDateString()` → `"Wed Jan 01 2025"`

### Invalid Category

- Only use one of: `financial`, `sales`, `marketing`, `customer`, `product`
- These match the dropdown options in the frontend

## Additional Tools (Optional)

You can extend the agent with additional tools:

```python
@tool(external_execution=True)
def submit_report_form() -> str:
    """Submit the currently filled report form."""
    return "Form submitted"

@tool
def get_report_suggestions(context: str) -> list[str]:
    """Get suggested report names based on context."""
    # Implementation here
    pass
```

## Security Considerations

- Frontend tools should only perform safe operations
- Validate all inputs before using them
- Don't expose sensitive operations through frontend tools
- Consider requiring manual confirmation for critical actions

## Next Steps

1. Deploy the agent to your backend server
2. Update the endpoint in `examples/saas-app/src/main.tsx` if needed
3. Test the integration by asking the agent to create reports
4. Monitor tool execution in browser console and backend logs
