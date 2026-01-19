# 7. React Chat UI

> **Prerequisites**: [06. React Basics](./06_react_basics.md)
> **Packages**: `@antipopp/agno-react`

## Overview

This cookbook walks through building a complete chat interface with React, including message rendering, input handling, auto-scroll, loading states, and styling.

## Complete Chat Application

```tsx
import {
  AgnoProvider,
  useAgnoChat,
  useAgnoSession,
  useAgnoActions,
} from '@antipopp/agno-react';
import { useState, useEffect, useRef, FormEvent } from 'react';
import type { ChatMessage } from '@antipopp/agno-types';

// Main App with Provider
function App() {
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'my-agent',
      }}
    >
      <ChatApp />
    </AgnoProvider>
  );
}

// Chat Application Layout
function ChatApp() {
  const { initialize, isInitializing, error } = useAgnoActions();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initialize()
      .then(() => setInitialized(true))
      .catch(console.error);
  }, [initialize]);

  if (isInitializing || !initialized) {
    return <LoadingScreen message="Connecting to agent..." />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <div className="chat-app">
      <SessionSidebar />
      <main className="chat-main">
        <MessageList />
        <ChatInput />
      </main>
    </div>
  );
}
```

## Session Sidebar

```tsx
function SessionSidebar() {
  const { sessions, currentSessionId, loadSession, fetchSessions, isLoading } = useAgnoSession();
  const { clearMessages, isStreaming } = useAgnoChat();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleNewChat = () => {
    if (isStreaming) return;
    clearMessages();
  };

  const handleSelectSession = (sessionId: string) => {
    if (isStreaming || sessionId === currentSessionId) return;
    loadSession(sessionId);
  };

  return (
    <aside className="sidebar">
      <button
        className="new-chat-btn"
        onClick={handleNewChat}
        disabled={isStreaming}
      >
        + New Chat
      </button>

      <div className="sessions-list">
        {isLoading && <div className="loading">Loading...</div>}

        {sessions.map((session) => (
          <button
            key={session.session_id}
            className={`session-item ${
              session.session_id === currentSessionId ? 'active' : ''
            }`}
            onClick={() => handleSelectSession(session.session_id)}
            disabled={isStreaming}
          >
            <span className="session-name">{session.session_name}</span>
            <span className="session-date">
              {new Date(session.created_at).toLocaleDateString()}
            </span>
          </button>
        ))}

        {sessions.length === 0 && !isLoading && (
          <p className="empty-state">No conversations yet</p>
        )}
      </div>
    </aside>
  );
}
```

## Message List with Auto-Scroll

```tsx
function MessageList() {
  const { messages, isStreaming, error } = useAgnoChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
  };

  if (messages.length === 0) {
    return (
      <div className="messages-empty">
        <h2>Start a conversation</h2>
        <p>Send a message to begin chatting with the agent.</p>
      </div>
    );
  }

  return (
    <div
      className="messages-container"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
          isLast={index === messages.length - 1}
          isStreaming={isStreaming}
        />
      ))}

      {error && (
        <div className="error-message">
          <span>Error: {error}</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
```

## Message Bubble Component

```tsx
function MessageBubble({
  message,
  isLast,
  isStreaming,
}: {
  message: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === 'user';
  const isAgent = message.role === 'agent';
  const showTypingIndicator = isAgent && isLast && isStreaming && !message.content;

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '🤖'}
      </div>

      <div className="message-content">
        <div className="message-header">
          <span className="sender">{isUser ? 'You' : 'Agent'}</span>
          <span className="timestamp">
            {new Date(message.created_at * 1000).toLocaleTimeString()}
          </span>
        </div>

        <div className="message-body">
          {message.content || (showTypingIndicator && <TypingIndicator />)}

          {/* Show streaming cursor */}
          {isAgent && isLast && isStreaming && message.content && (
            <span className="cursor">▋</span>
          )}
        </div>

        {/* Tool calls */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <ToolCallsSection toolCalls={message.tool_calls} />
        )}

        {/* Error indicator */}
        {message.streamingError && (
          <div className="message-error">
            ⚠️ Message failed to complete
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}
```

## Tool Calls Display

```tsx
import type { ToolCall } from '@antipopp/agno-types';

function ToolCallsSection({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="tool-calls">
      {toolCalls.map((tool) => {
        const isExpanded = expandedTools.has(tool.tool_call_id);

        return (
          <div
            key={tool.tool_call_id}
            className={`tool-call ${tool.tool_call_error ? 'error' : 'success'}`}
          >
            <button
              className="tool-header"
              onClick={() => toggleTool(tool.tool_call_id)}
            >
              <span className="tool-icon">🔧</span>
              <span className="tool-name">{tool.tool_name}</span>
              <span className="tool-time">{tool.metrics.time}ms</span>
              <span className="tool-expand">{isExpanded ? '▼' : '▶'}</span>
            </button>

            {isExpanded && (
              <div className="tool-details">
                <div className="tool-args">
                  <strong>Arguments:</strong>
                  <pre>{JSON.stringify(tool.tool_args, null, 2)}</pre>
                </div>
                <div className="tool-result">
                  <strong>Result:</strong>
                  <pre>{tool.content}</pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

## Chat Input Component

```tsx
function ChatInput() {
  const { sendMessage, isStreaming, error } = useAgnoChat();
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isStreaming || (!input.trim() && files.length === 0)) return;

    const message = input.trim();
    setInput('');
    setFiles([]);

    try {
      if (files.length > 0) {
        const formData = new FormData();
        formData.append('message', message || 'Please analyze these files');
        files.forEach((file) => formData.append('file', file));
        await sendMessage(formData);
      } else {
        await sendMessage(message);
      }
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      {/* File previews */}
      {files.length > 0 && (
        <div className="file-previews">
          {files.map((file, index) => (
            <div key={index} className="file-preview">
              <span>{file.name}</span>
              <button type="button" onClick={() => removeFile(index)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="input-row">
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
        >
          📎
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          hidden
        />

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isStreaming}
          rows={1}
        />

        <button
          type="submit"
          className="send-btn"
          disabled={isStreaming || (!input.trim() && files.length === 0)}
        >
          {isStreaming ? '...' : '➤'}
        </button>
      </div>
    </form>
  );
}
```

## Utility Components

```tsx
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="error-screen">
      <h2>Connection Error</h2>
      <p>{message}</p>
      <button onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  );
}
```

## CSS Styles

```css
/* Base layout */
.chat-app {
  display: flex;
  height: 100vh;
  font-family: system-ui, sans-serif;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.new-chat-btn {
  padding: 12px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 16px;
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
}

.session-item {
  width: 100%;
  padding: 12px;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
}

.session-item:hover {
  background: #e8e8e8;
}

.session-item.active {
  background: #d0e8ff;
}

/* Main chat area */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.messages-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.message-content {
  max-width: 70%;
}

.message.user .message-content {
  background: #0066cc;
  color: white;
  padding: 12px 16px;
  border-radius: 16px 16px 4px 16px;
}

.message.agent .message-content {
  background: #f0f0f0;
  padding: 12px 16px;
  border-radius: 16px 16px 16px 4px;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #666;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Chat input */
.chat-input {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 24px;
  resize: none;
  max-height: 120px;
  font-size: 16px;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #0066cc;
  color: white;
  cursor: pointer;
  font-size: 18px;
}

.send-btn:disabled {
  background: #ccc;
}

/* Tool calls */
.tool-calls {
  margin-top: 12px;
}

.tool-call {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 8px;
}

.tool-header {
  width: 100%;
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  background: transparent;
  border: none;
  cursor: pointer;
}

.tool-details {
  padding: 12px;
  border-top: 1px solid #eee;
}

.tool-details pre {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}
```

## Key Points

- Use `useRef` and `scrollIntoView` for auto-scrolling
- Detect manual scroll to disable auto-scroll when user scrolls up
- Handle both text and FormData for file uploads
- Use Shift+Enter for newlines, Enter to send
- Show typing indicator while streaming
- Display tool calls in collapsible sections
- Handle error states and retry options

## Next Steps

Continue to [08. Tool Execution Basics](./08_tool_execution_basics.md) to learn about frontend tool execution (HITL).
