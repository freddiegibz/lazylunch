import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
// If you get a module error, run: npm install raw-body
import getRawBody from 'raw-body';

// Initialize Stripe (use the type as string for apiVersion to avoid type error)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' as any });

// Initialize Supabase (use env vars for security)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const config = { api: { bodyParser: false } };

const PRICE_ID_TO_MEMBERSHIP: Record<string, string> = {
  'price_1RifEpB4uyQdSSUI7iRCrIcE': 'basic',
  'price_1RifFfB4uyQdSSUINbh45IDW': 'standard',
  'price_1RifFyB4uyQdSSUIKmYfTfRw': 'premium',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, 'whsec_76xdHYYL0cnx7mkmzg2KntKFRAqhGWbP');
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    // Get customer email
    const email = session.customer_email || (session.customer_details && session.customer_details.email);
    // Always fetch the subscription to get the priceId
    let priceId = null;
    if (session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        priceId = subscription.items.data[0].price.id;
      } catch (e) {
        console.error('Failed to fetch subscription for priceId:', e);
      }
    }
    // Map priceId to membership
    const membership = PRICE_ID_TO_MEMBERSHIP[priceId as string];
    if (email && membership) {
      // Update Supabase profile
      const { error } = await supabase
        .from('profiles')
        .update({ membership })
        .eq('email', email);
      if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({ error: 'Failed to update membership in Supabase' });
      }
    }
  }

  res.status(200).json({ received: true });
} 