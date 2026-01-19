# Release Notes: v0.9.0

## 🎉 Custom Query Parameters Support

This release adds comprehensive support for custom query parameters across all API requests, mirroring the existing headers functionality for consistent API customization.

## ✨ What's New

### Global Query Parameters
Configure query parameters once and have them automatically included in all API requests:

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  agentId: 'agent-123',
  params: {
    locale: 'en-US',
    api_version: 'v2',
    environment: 'production'
  }
});
```

### Per-Request Parameters
Override or add parameters for specific requests:

```typescript
await client.sendMessage('Hello!', {
  params: {
    temperature: '0.7',
    max_tokens: '500'
  }
});
```

### React Integration
Seamless integration with React hooks:

```tsx
<AgnoProvider config={{
  endpoint: 'http://localhost:7777',
  agentId: 'agent-123',
  params: { locale: 'en-US' }
}}>
  <App />
</AgnoProvider>

// In components
const { sendMessage } = useAgnoChat();
await sendMessage('Hello', {
  params: { debug: 'true' }
});
```

## 📦 Package Updates

All three packages have been updated to **v0.9.0**:

- **@antipopp/agno-types** - Added `params` field to config types
- **@antipopp/agno-client** - Full query parameter support across all methods
- **@antipopp/agno-react** - All hooks support params option

## 🔧 Supported Methods

Query parameters work with **all** API methods:

| Method | Example Usage |
|--------|--------------|
| `sendMessage()` | `sendMessage('Hello', { params: { temperature: '0.7' } })` |
| `continueRun()` | `continueRun(tools, { params: { debug: 'true' } })` |
| `loadSession()` | `loadSession('id', { params: { include_metadata: 'true' } })` |
| `fetchSessions()` | `fetchSessions({ params: { limit: '50' } })` |
| `deleteSession()` | `deleteSession('id', { params: { force: 'true' } })` |
| `checkStatus()` | `checkStatus({ params: { verbose: 'true' } })` |
| `fetchAgents()` | `fetchAgents({ params: { filter: 'active' } })` |
| `fetchTeams()` | `fetchTeams({ params: { page: '2' } })` |
| `initialize()` | `initialize({ params: { preload: 'true' } })` |

## 🎯 Common Use Cases

### API Versioning
```typescript
params: { api_version: 'v2' }
```

### Model Configuration
```typescript
params: {
  temperature: '0.7',
  max_tokens: '500',
  top_p: '0.9'
}
```

### Localization
```typescript
params: {
  locale: 'en-US',
  timezone: 'America/New_York'
}
```

### Debugging & Tracing
```typescript
params: {
  debug: 'true',
  trace_id: 'xyz123',
  verbose: 'true'
}
```

### Pagination
```typescript
params: {
  page: '1',
  limit: '50',
  offset: '0'
}
```

### Feature Flags
```typescript
params: {
  enable_streaming: 'true',
  use_cache: 'false'
}
```

## 🔄 Parameter Merging

Parameters merge with clear precedence:

1. **Global params** from `config.params` (lowest)
2. **Per-request params** from `options.params` (highest)

```typescript
const client = new AgnoClient({
  params: { version: 'v1', locale: 'en-US' }
});

// Result: version=v2 (overridden), locale=en-US (from global), debug=true (added)
await client.sendMessage('Hello', {
  params: { version: 'v2', debug: 'true' }
});
```

## 🎨 Combining Headers and Params

Use both headers and params together:

```typescript
await client.sendMessage('Hello', {
  headers: {
    'X-Request-ID': crypto.randomUUID(),
    'X-Client-Version': '1.0.0'
  },
  params: {
    temperature: '0.7',
    debug: 'true'
  }
});
```

## 🔒 Backward Compatibility

This is a **fully backward-compatible** release. No code changes are required - the `params` field is optional and all existing code continues to work without modification.

## 📚 Documentation

Complete documentation has been added:

- **CLAUDE.md** - Developer guide with comprehensive examples
- **packages/core/README.md** - Core client API documentation
- **packages/react/README.md** - React hooks documentation
- **CHANGELOG.md** - Detailed technical changelog

## 🚀 Installation

```bash
# Update to latest version
npm install @antipopp/agno-react@0.9.0

# Or for core client only
npm install @antipopp/agno-client@0.9.0

# Or for types only
npm install @antipopp/agno-types@0.9.0
```

## ✅ Quality Assurance

- ✅ All packages build successfully
- ✅ All TypeScript type checks pass
- ✅ No breaking changes
- ✅ Full test coverage of new functionality
- ✅ Comprehensive documentation

## 🙏 Upgrade Recommendation

We recommend upgrading to v0.9.0 to take advantage of flexible query parameter support for API customization, especially useful for:

- Multi-environment deployments
- A/B testing with feature flags
- Model parameter tuning
- API versioning strategies
- Debugging and tracing

## 📝 Full Changelog

See [CHANGELOG.md](./CHANGELOG.md#090---2026-01-09) for complete details.

---

**Published**: 2026-01-09
**License**: MIT
**Repository**: https://github.com/antipopp/agno-client
