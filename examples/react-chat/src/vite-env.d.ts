/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGNO_ENDPOINT?: string
  readonly VITE_AGNO_AUTH_TOKEN?: string
  readonly VITE_AGNO_MODE?: string
  readonly VITE_AGNO_AGENT_ID?: string
  readonly VITE_AGNO_TEAM_ID?: string
  readonly VITE_AGNO_DB_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
