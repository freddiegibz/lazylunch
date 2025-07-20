import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import fs from 'fs'
import path from 'path'

// Initialize Stripe instance
let stripe: Stripe | null = null

function initializeStripe() {
  if (!stripe) {
    // Debug environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY is missing!')
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }

    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return stripe
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Initialize Stripe when the request is actually processed
    const stripe = initializeStripe()

    // Parse priceId from request body (support both JSON and empty body for backward compatibility)
    let priceId = 'price_1RifFyB4uyQdSSUIKmYfTfRw' // Default to Premium
    let supabaseUserId = undefined;
    if (req.headers['content-type'] === 'application/json') {
      const body = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      if (body && body.priceId && typeof body.priceId === 'string') {
        priceId = body.priceId
      }
      if (body && body.supabaseUserId && typeof body.supabaseUserId === 'string') {
        supabaseUserId = body.supabaseUserId;
      }
    }

    if (!priceId || typeof priceId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid priceId' })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true, // Enable promo code field
      metadata: supabaseUserId ? { supabaseUserId } : {},
      success_url: `${req.headers.origin}/dashboard?success=true`,
      cancel_url: `${req.headers.origin}/dashboard?canceled=true`,
    })

    res.status(200).json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ 
      error: err.message, 
      details: err,
      debug: {
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
        nodeEnv: process.env.NODE_ENV
      }
    })
  }
} 