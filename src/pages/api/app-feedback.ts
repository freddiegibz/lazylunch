import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { rating, message = '' } = req.body || {}
  if (!rating || !['like','dislike'].includes(rating)) {
    return res.status(400).json({ error: 'Invalid rating' })
  }
  const truncated = String(message).slice(0, 500)

  let userId: string | null = null
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) userId = user.id
    }
  } catch {}

  const path = req.headers['x-path'] as string || req.headers.referer || ''
  const userAgent = req.headers['user-agent'] || ''

  const { error } = await supabase
    .from('app_feedback')
    .insert([{ user_id: userId, rating, message: truncated, path, user_agent: userAgent }])

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
} 