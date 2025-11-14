import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': `${import.meta.env.VITE_APP_NAME}@${import.meta.env.VITE_APP_VERSION}`
    }
  }
})

// Helper function to check connection
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('finance_coffee_lots').select('count').limit(1)
    if (error) throw error
    return { connected: true, error: null }
  } catch (error) {
    console.error('Supabase connection error:', error)
    return { connected: false, error: error.message }
  }
}

// Export environment variables for use in components
export const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Great Pearl Finance',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_APP_ENVIRONMENT || 'development'
  },
  api: {
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3
  },
  ui: {
    defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY || 'UGX',
    defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE || 'en-UG',
    itemsPerPage: parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 20
  },
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    debug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
    notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true'
  }
}