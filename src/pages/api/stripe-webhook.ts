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
    console.log('🔍 Webhook Debug - Customer email:', email);
    
    // Always fetch the subscription to get the priceId
    let priceId = null;
    if (session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        priceId = subscription.items.data[0].price.id;
        console.log('🔍 Webhook Debug - Price ID:', priceId);
      } catch (e) {
        console.error('Failed to fetch subscription for priceId:', e);
      }
    }
    
    // Map priceId to membership
    const membership = PRICE_ID_TO_MEMBERSHIP[priceId as string];
    console.log('🔍 Webhook Debug - Mapped membership:', membership);
    
    if (email && membership) {
      console.log('🔍 Webhook Debug - Attempting to update Supabase profile');
      console.log('🔍 Webhook Debug - Email:', email);
      console.log('🔍 Webhook Debug - Membership:', membership);
      
      // First, let's check if the profiles table exists and what columns it has
      try {
        const { data: tableInfo, error: tableError } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.error('❌ Error accessing profiles table:', tableError);
        } else {
          console.log('✅ Profiles table accessible');
          console.log('🔍 Table structure sample:', tableInfo);
        }
      } catch (e) {
        console.error('❌ Error checking table structure:', e);
      }
      
      // Find user by email first, then update by ID
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      let userId = null;
      
      if (userData?.users) {
        const user = userData.users.find(u => u.email === email);
        if (user) {
          userId = user.id;
          console.log('🔍 Webhook Debug - Found user ID:', userId);
        }
      }
      
      if (userId) {
        // Update Supabase profile using user ID
        const { data, error } = await supabase
          .from('profiles')
          .update({ membership })
          .eq('id', userId)
          .select();
          
        if (error) {
          console.error('❌ Supabase update error:', error);
          console.error('❌ Error code:', error.code);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error details:', error.details);
          console.error('❌ Error hint:', error.hint);
          return res.status(500).json({ error: 'Failed to update membership in Supabase', details: error });
        } else {
          console.log('✅ Supabase update successful:', data);
        }
      } else {
        console.log('⚠️ Webhook Debug - Could not find user ID for email:', email);
      }
    } else {
      console.log('⚠️ Webhook Debug - Missing email or membership:', { email, membership });
    }
  }

  res.status(200).json({ received: true });
} 