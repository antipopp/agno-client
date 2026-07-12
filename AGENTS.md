# AGENTS.md
Guidance for agentic coding tools operating in this repository.
Derived from the current codebase, `CLAUDE.md`, and CI workflows.

## Rule Files (Cursor/Copilot)
- Checked `.cursor/rules/`: not present.
- Checked `.cursorrules`: not present.
- Checked `.github/copilot-instructions.md`: not present.
- If any are added later, treat them as mandatory constraints.

## Source Of Truth
- Architecture and workflow guidance: `CLAUDE.md`.
- CI behavior: `.github/workflows/ci.yml`.
- Build/test scripts: root and package `package.json` files.
- Vitest workspace config: `vitest.workspace.ts`.

## Runtime Baseline
- CI validates Node.js 18 and 20.
- Coverage job runs on Node.js 20.
- Workspace package manager is `pnpm@9.15.4`.
- CI installs with `pnpm install --frozen-lockfile`.

## Repository Layout
- Package manager: `pnpm` workspace (`pnpm-workspace.yaml`).
- Main packages:
  - `packages/types` -> `@antipopp/agno-types`
  - `packages/core` -> `@antipopp/agno-client`
  - `packages/react` -> `@antipopp/agno-react`
- Dependency direction is strict: `types` <- `core` <- `react`.
- Keep that layering intact unless explicitly requested otherwise.

## Core Commands
- Install dependencies: `pnpm install`
- Clean artifacts: `pnpm clean`
- Build all packages: `pnpm build`
- Watch mode: `pnpm dev`
- Typecheck all packages: `pnpm typecheck`
- Test all packages (workspace): `pnpm test`
- Test watch mode: `pnpm test:watch`
- Coverage: `pnpm test:coverage`
- Lint with autofix: `pnpm lint` (runs `pnpm ultracite fix`)
- CI lint without autofix: `pnpm ultracite check`

## Package-Scoped Commands
- Build one package:
  - `pnpm --filter @antipopp/agno-types build`
  - `pnpm --filter @antipopp/agno-client build`
  - `pnpm --filter @antipopp/agno-react build`
- Typecheck one package:
  - `pnpm --filter @antipopp/agno-types typecheck`
  - `pnpm --filter @antipopp/agno-client typecheck`
  - `pnpm --filter @antipopp/agno-react typecheck`
- Test one package:
  - `pnpm --filter @antipopp/agno-types test`
  - `pnpm --filter @antipopp/agno-client test`
  - `pnpm --filter @antipopp/agno-react test`

## Single-Test Commands (Important)
- Preferred: package-scoped command with explicit test file.
- Core single file:
  - `pnpm --filter @antipopp/agno-client test -- src/__tests__/managers/config-manager.test.ts`
- React single file:
  - `pnpm --filter @antipopp/agno-react test -- src/__tests__/hooks/useAgnoChat.test.tsx`
- Types single file:
  - `pnpm --filter @antipopp/agno-types test -- src/__tests__/events.test.ts`
- Run one test by name (`-t`):
  - `pnpm --filter @antipopp/agno-client test -- src/__tests__/managers/config-manager.test.ts -t "should get and set endpoint"`
- Alternative from repo root:
  - `pnpm test -- packages/core/src/__tests__/managers/config-manager.test.ts`

## Required Verification Flow
Per `CLAUDE.md`, after code changes run:
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
For small changes, run a targeted single test first, then the full suite.

## Style Guide: Formatting
- Use TypeScript with strict typing.
- Root TS config is strict (`strict: true`, `noUnusedLocals`, `noUnusedParameters`).
- Match repository formatting: double quotes and semicolons.
- Keep formatter-managed trailing commas.
- Prefer early returns and guard clauses over deep nesting.
- Add comments only when a block is genuinely non-obvious.

## Style Guide: Imports And Exports
- Use `import type` for type-only imports.
- Order imports as external packages, then internal relative modules.
- Keep imports explicit; avoid wildcard imports.
- Re-export public APIs through each package `src/index.ts`.
- Prefer named exports for library surfaces.

## Style Guide: Types
- Update `packages/types` first for API contract changes.
- Preserve backend field names in shared types (`created_at`, `tool_call_id`, etc.).
- Do not rename API fields to camelCase in transport models.
- Prefer `unknown` over `any`, then narrow with runtime checks.
- Keep optional fields optional; do not force defaults in type declarations.
- Keep enum/string literal values exact (for example `RunEvent`).

## Style Guide: Naming
- `PascalCase`: classes, interfaces, type aliases, enums, React components.
- `camelCase`: functions, methods, variables, hooks, helper utilities.
- `UPPER_SNAKE_CASE`: true constants.
- Hook names must begin with `use`.
- Tests should use clear "should ..." behavior wording.

## Style Guide: State And Architecture
- Respect package layering: `types` <- `core` <- `react`.
- Keep core framework-agnostic; no React-specific logic in `packages/core`.
- Prefer immutable state updates in stores/managers.
- Keep concerns split by module role (manager/store/parser/processor/hook).
- In React hooks, subscribe to client events in `useEffect` and clean up listeners.

## Error Handling And Logging
- Throw explicit `Error` instances for invalid state and failed network operations.
- In hooks, catch errors to set UI state; rethrow when callers need control.
- Narrow unknown errors via `instanceof Error` before reading `.message`.
- Use `finally` for cleanup of transient flags.
- Prefer `Logger` in core package; it sanitizes sensitive fields.
- Do not log secrets (tokens, auth headers, credentials).

## Streaming And API Constraints
- Preserve support for both legacy and new streaming event formats.
- Keep merge precedence logic intact for headers, params, and dependencies.
- Agent and team runs support `/continue`; teams send `requirements` instead of agent `tools`.
- Maintain compatibility with official Agno event/type contracts.

## Testing Conventions
- Test framework: Vitest.
- Core tests use MSW for network mocking.
- React tests use Testing Library with `happy-dom`.
- Place tests under `src/**/*.test.ts` or `src/**/*.test.tsx`.
- Add happy-path and failure/edge-case coverage for behavior changes.

## Test Environment Details
- Vitest workspace projects are `packages/types`, `packages/core`, and `packages/react`.
- `packages/types` tests run in `node` environment.
- `packages/core` tests run in `node` with setup file `src/__tests__/setup.ts`.
- `packages/react` tests run in `happy-dom` with setup file `src/__tests__/setup.ts`.

## Agent Workflow Checklist
- Read `CLAUDE.md` before major changes.
- Keep edits minimal and focused.
- Preserve public API compatibility unless a breaking change is explicitly requested.
- Update docs/examples when public behavior changes.
- Report exactly which verification commands were run.

## v1 Maintenance Boundaries
- Treat v1 as a stability contract for package exports, documented core behavior, React hooks, and shared event/type contracts.
- Keep experimental surfaces opt-in: frontend tool execution, tool argument validation helpers, and generative UI rendering.
- Use `params` and `dependencies` for feature flags. Do not add a flag platform, remote rollout service, SDK-side registry, or hidden default behavior.
- Release checklist: `pnpm release:check`, `pnpm ultracite check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before any publish attempt.
- Roadmap split: v1 is stabilization and truthful release signal; post-v1 is broader API coverage, richer UI helpers, example smoke automation, or release tooling if needed.
- agent-assisted work may draft changelog notes, API-diff reports, release-risk summaries, and verification evidence. Humans approve SemVer breaks, final release notes, npm publish, rollback, and deprecation plans.
