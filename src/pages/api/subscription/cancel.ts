import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' as any })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function getOrFindSubscription(userId: string, email?: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', userId)
    .single()

  let subId = profile?.stripe_subscription_id as string | null
  let customerId = profile?.stripe_customer_id as string | null

  if (!customerId && email) {
    const custs = await stripe.customers.list({ email, limit: 1 })
    if (custs.data.length > 0) customerId = custs.data[0].id
  }

  if (customerId && !subId) {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
    const pick = subs.data.find(s => s.status === 'active' || s.status === 'trialing') || subs.data[0]
    if (pick) subId = pick.id
  }

  if ((customerId || subId)) {
    await supabase.from('profiles')
      .update({ stripe_customer_id: customerId, stripe_subscription_id: subId })
      .eq('id', userId)
  }

  return { subId, customerId }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const auth = req.headers.authorization
    const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'Not authenticated' })

    const { subId } = await getOrFindSubscription(user.id, user.email || undefined)
    if (!subId) return res.status(400).json({ error: 'No subscription found' })

    const updated: Stripe.Subscription = await stripe.subscriptions.update(subId, { cancel_at_period_end: true })

    await supabase.from('profiles')
      .update({
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: updated.current_period_end ? new Date((updated.current_period_end as number) * 1000).toISOString() : null,
      })
      .eq('id', user.id)

    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
} 