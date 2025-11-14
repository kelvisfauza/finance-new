/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_APP_ENVIRONMENT?: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_API_RETRY_ATTEMPTS?: string
  readonly VITE_DEFAULT_CURRENCY?: string
  readonly VITE_DEFAULT_LOCALE?: string
  readonly VITE_ITEMS_PER_PAGE?: string
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_ENABLE_DEBUG?: string
  readonly VITE_ENABLE_NOTIFICATIONS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
