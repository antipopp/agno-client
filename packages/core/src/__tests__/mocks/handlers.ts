import { HttpResponse, http } from "msw";

// Default mock responses
export const mockAgents = [
  {
    id: "agent-1",
    name: "Test Agent",
    description: "A test agent",
    db_id: "db-1",
  },
  {
    id: "agent-2",
    name: "Another Agent",
    db_id: "db-1",
  },
];

export const mockTeams = [
  {
    id: "team-1",
    name: "Test Team",
    description: "A test team",
    db_id: "db-1",
  },
];

export const mockSessions = [
  {
    session_id: "session-1",
    session_name: "Test Session",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    session_id: "session-2",
    session_name: "Another Session",
    created_at: "2024-01-02T00:00:00Z",
  },
];

export const mockSessionRuns = [
  {
    run_id: "run-1",
    run_input: "Hello",
    content: "Hi there!",
    followups: ["Ask a follow-up question"],
    created_at: "2024-01-01T00:00:00Z",
  },
];

export const mockApprovalStatus = {
  approval_id: "approval-1",
  status: "pending",
  run_id: "run-123",
  resolved_at: null,
  resolved_by: null,
};

export const handlers = [
  // Health check
  http.get("http://localhost:7777/health", () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Agents list
  http.get("http://localhost:7777/agents", () => {
    return HttpResponse.json(mockAgents);
  }),

  // Teams list
  http.get("http://localhost:7777/teams", () => {
    return HttpResponse.json(mockTeams);
  }),

  // Sessions list
  http.get("http://localhost:7777/sessions", ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const componentId = url.searchParams.get("component_id");

    // Return sessions for valid requests
    if (type && componentId) {
      return HttpResponse.json({
        data: mockSessions,
        meta: {
          page: 1,
          limit: 50,
          total_pages: 1,
          total_count: mockSessions.length,
          search_time_ms: 5,
        },
      });
    }

    return HttpResponse.json({ data: [], meta: {} });
  }),

  // Session runs
  http.get("http://localhost:7777/sessions/:sessionId/runs", () => {
    return HttpResponse.json(mockSessionRuns);
  }),

  // Delete session
  http.delete("http://localhost:7777/sessions/:sessionId", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Approval status
  http.get("http://localhost:7777/approvals/:approvalId/status", () => {
    return HttpResponse.json(mockApprovalStatus);
  }),

  // Agent run (streaming)
  http.post("http://localhost:7777/agents/:agentId/runs", () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send RunStarted event
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              event: "RunStarted",
              content_type: "text/plain",
              run_id: "run-123",
              session_id: "session-123",
              created_at: Math.floor(Date.now() / 1000),
            })
          )
        );

        // Send RunContent events
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              event: "RunContent",
              content: "Hello",
              content_type: "text/plain",
              created_at: Math.floor(Date.now() / 1000),
            })
          )
        );

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              event: "RunContent",
              content: "Hello, world!",
              content_type: "text/plain",
              created_at: Math.floor(Date.now() / 1000),
            })
          )
        );

        // Send RunCompleted event
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              event: "RunCompleted",
              content: "Hello, world!",
              content_type: "text/plain",
              created_at: Math.floor(Date.now() / 1000),
            })
          )
        );

        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
      },
    });
  }),

  // Team run (streaming)
  http.post("http://localhost:7777/teams/:teamId/runs", () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              event: "TeamRunStarted",
              content_type: "text/plain",
              run_id: "run-123",
              session_id: "session-123",
              created_at: Math.floor(Date.now() / 1000),
            })
          )
        );

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              event: "TeamRunCompleted",
              content: "Team response",
              content_type: "text/plain",
              created_at: Math.floor(Date.now() / 1000),
            })
          )
        );

        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
      },
    });
  }),

  // Continue paused run
  http.post(
    "http://localhost:7777/agents/:agentId/runs/:runId/continue",
    () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                event: "RunContinued",
                content_type: "text/plain",
                run_id: "run-123",
                created_at: Math.floor(Date.now() / 1000),
              })
            )
          );

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                event: "RunCompleted",
                content: "Continued response",
                content_type: "text/plain",
                created_at: Math.floor(Date.now() / 1000),
              })
            )
          );

          controller.close();
        },
      });

      return new HttpResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
        },
      });
    }
  ),

  // Cancel agent run - returns simple success response
  http.post("http://localhost:7777/agents/:agentId/runs/:runId/cancel", () => {
    return HttpResponse.json({ success: true }, { status: 200 });
  }),
];
