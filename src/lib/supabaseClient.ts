import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug logging for environment variables
console.log('Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0
})

// Create mock client or real client based on environment variables
const supabase = (!supabaseUrl || !supabaseAnonKey)
  ? {
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured. Please check your .env file.' } })
        })
      })
    } as any
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'great-pearl-finance@1.0.0'
        }
      }
    })

// Helper function to check connection
const checkSupabaseConnection = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      VITE_SUPABASE_URL: supabaseUrl ? 'present' : 'missing',
      VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'present' : 'missing'
    })

    return {
      connected: false,
      error: 'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    }
  }

  try {
    console.log('Testing Supabase connection...')

    // Simple query to test connection
    const { data, error } = await supabase
      .from('finance_coffee_lots')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Supabase connection error:', error)
      return { connected: false, error: error.message }
    }

    console.log('Supabase connection successful')
    return { connected: true, error: null }
  } catch (error: any) {
    console.error('Network error during connection test:', error)
    return {
      connected: false,
      error: `Network error: ${error.message || 'Failed to connect to Supabase'}`
    }
  }
}

export { supabase, checkSupabaseConnection }

// Export environment variables for use in components
export const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Great Pearl Finance',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_APP_ENVIRONMENT || 'development'
  },
  api: {
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000') || 10000,
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3') || 3
  },
  ui: {
    defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY || 'UGX',
    defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE || 'en-UG',
    itemsPerPage: parseInt(import.meta.env.VITE_ITEMS_PER_PAGE || '20') || 20
  },
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    debug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
    notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true'
  }
}