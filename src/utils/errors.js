const MESSAGES = {
  '42501': 'You do not have permission to perform this action.',
  '23505': 'This entry already exists.',
  '42P01': 'A system table is missing. Please contact support.',
  '42703': 'A system column is missing. Please contact support.',
  'PGRST116': 'No results found.',
  'PGRST104': 'Request timed out. Please check your internet connection.',
  'PGRST100': 'Invalid request. Please try again.',
  '22P02': 'Invalid input format.',
  '23503': 'This record is linked to other data and cannot be deleted.',
  '23514': 'This value violates a data constraint.',
}

export function friendlyError(err) {
  if (!err) return 'Something went wrong. Please try again.'

  const msg = err.message || err.toString()

  // Known Supabase error codes
  for (const [code, friendly] of Object.entries(MESSAGES)) {
    if (msg.includes(code)) return friendly
  }

  // Common message patterns
  if (msg.includes('permission denied')) return 'You do not have permission to perform this action.'
  if (msg.includes('duplicate key') || msg.includes('already exists')) return 'This entry already exists.'
  if (msg.includes('JWT expired') || msg.includes('token')) return 'Your session has expired. Please sign in again.'
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) return 'A network error occurred. Please check your internet connection.'
  if (msg.includes('violates row-level security')) return 'You do not have permission to access this data.'
  if (msg.includes('email') && msg.includes('not confirmed')) return 'Please verify your email address first.'
  if (msg.includes('Invalid login credentials') || msg.includes('Invalid Login')) return 'Invalid email or password. Please try again.'

  // Fallback: don't leak raw DB messages
  console.error('Unhandled error:', err)
  return 'Something went wrong. Please try again later.'
}
