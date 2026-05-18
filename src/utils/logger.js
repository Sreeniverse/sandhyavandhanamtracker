import { supabase } from '../supabase'

export function logError(context, err) {
  console.error(context, err)

  const message = err?.message || (typeof err === 'string' ? err : 'Unknown error')

  supabase
    .from('error_logs')
    .insert({
      context,
      message,
      stack: err?.stack || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })
    .catch(() => {})
}
