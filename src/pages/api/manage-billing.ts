import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' as any })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Get user id from auth token
    const auth = req.headers.authorization
    const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null
    if (!token) return res.status(401).json({ error: 'Not authenticated' })
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: 'Not authenticated' })

    // Find customer by searching subscriptions with metadata.supabaseUserId
    const subs = await stripe.subscriptions.list({ limit: 1, status: 'all', expand: ['data.customer'] ,  customer: undefined })
    let customerId: string | null = null

    // Try searching by email first (fallback)
    const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 })
    if (customers.data.length > 0) customerId = customers.data[0].id

    // If webhook stored customer id in profiles in future, prefer that
    // const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
    // if (profile?.stripe_customer_id) customerId = profile.stripe_customer_id

    if (!customerId) return res.status(400).json({ error: 'No Stripe customer found for user' })

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin}/dashboard`
    })
    return res.status(200).json({ url: session.url })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
} 