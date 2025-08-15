import { NextApiRequest, NextApiResponse } from 'next';
import StripeLib from 'stripe';
import { createClient } from '@supabase/supabase-js';
// If you get a module error, run: npm install raw-body
import getRawBody from 'raw-body';

// Initialize Stripe (loose typing to avoid deep TS instantiation)
const stripe: any = new StripeLib(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' as any });

// Initialize Supabase (use env vars for security)
const supabase: any = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any;

export const config = { api: { bodyParser: false } };

const PRICE_ID_TO_MEMBERSHIP: Record<string, string> = {
  'price_1RifEpB4uyQdSSUI7iRCrIcE': 'basic',
  'price_1RifFfB4uyQdSSUINbh45IDW': 'standard',
  'price_1RifFyB4uyQdSSUIKmYfTfRw': 'premium',
};

async function safeUpdateByUserId(userId: string, fields: Record<string, any>) {
  try { await supabase.from('profiles').update(fields).eq('id', userId); } catch {}
}

async function safeUpdateByStripeSubId(subscriptionId: string, fields: Record<string, any>) {
  try { await supabase.from('profiles').update(fields).eq('stripe_subscription_id' as any, subscriptionId as any); } catch {}
}

async function safeUpdateByStripeCustomerId(customerId: string, fields: Record<string, any>) {
  try { await supabase.from('profiles').update(fields).eq('stripe_customer_id' as any, customerId as any); } catch {}
}

function mapMembershipFromSubscription(sub: any): string | null {
  const priceId = sub?.items?.data?.[0]?.price?.id;
  return priceId ? (PRICE_ID_TO_MEMBERSHIP[priceId] || null) : null;
}

function extractLifecycleFields(sub: any) {
  return {
    stripe_subscription_id: sub?.id,
    stripe_customer_id: typeof sub?.customer === 'string' ? sub?.customer : sub?.customer?.id,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
    current_period_end: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  } as Record<string, any>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const sig = req.headers['stripe-signature'] as string;
  let event: any;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, 'whsec_76xdHYYL0cnx7mkmzg2KntKFRAqhGWbP');
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const supabaseUserId = session?.metadata?.supabaseUserId;

      let subscription: any = null;
      if (session?.subscription) {
        try { subscription = await stripe.subscriptions.retrieve(session.subscription as string); } catch {}
      }

      if (supabaseUserId && subscription) {
        const membership = mapMembershipFromSubscription(subscription) || 'basic';
        const lifecycle = extractLifecycleFields(subscription);
        await safeUpdateByUserId(supabaseUserId, { membership, ...lifecycle });
      } else if (supabaseUserId) {
        await safeUpdateByUserId(supabaseUserId, { membership: 'basic' });
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as any;
      const lifecycle = extractLifecycleFields(subscription);
      const membership = (subscription?.status === 'active' || subscription?.status === 'trialing')
        ? (mapMembershipFromSubscription(subscription) || 'basic')
        : 'free';

      await safeUpdateByStripeSubId(subscription?.id, { membership, ...lifecycle });
      if (typeof subscription?.customer === 'string') {
        await safeUpdateByStripeCustomerId(subscription.customer, { membership, ...lifecycle });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      const lifecycle = extractLifecycleFields(subscription);
      await safeUpdateByStripeSubId(subscription?.id, { membership: 'free', ...lifecycle });
      if (typeof subscription?.customer === 'string') {
        await safeUpdateByStripeCustomerId(subscription.customer, { membership: 'free', ...lifecycle });
      }
    }

    res.status(200).json({ received: true });
  } catch (e: any) {
    console.error('Stripe webhook handling error:', e?.message || e);
    res.status(200).json({ received: true });
  }
} 