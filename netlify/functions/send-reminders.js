export default async function handler() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const cronSecret = process.env.CRON_SECRET

  if (!supabaseUrl || !cronSecret) {
    return new Response(JSON.stringify({
      error: 'Missing SUPABASE_URL/VITE_SUPABASE_URL or CRON_SECRET',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const edgeFunctionUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-reminders`
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
    },
  })

  const body = await response.text()
  return new Response(body, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  })
}

export const config = {
  schedule: '*/5 * * * *',
}
