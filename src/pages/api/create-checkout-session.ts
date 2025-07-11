import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import fs from 'fs'
import path from 'path'

// Initialize Stripe instance
let stripe: Stripe | null = null

function initializeStripe() {
  if (!stripe) {
    // Debug environment variables
    console.log('=== STRIPE API DEBUG START ===')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY)
    console.log('STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY?.length || 0)
    console.log('STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'undefined')
    console.log('All env vars with STRIPE:', Object.keys(process.env).filter(key => key.includes('STRIPE')))
    
    // Debug .env.local file contents
    try {
      const envPath = path.join(process.cwd(), '.env.local')
      console.log('🔍 Checking .env.local file at:', envPath)
      console.log('File exists:', fs.existsSync(envPath))
      
      if (fs.existsSync(envPath)) {
        const fileContent = fs.readFileSync(envPath, 'utf8')
        console.log('📄 .env.local file content:')
        console.log('Raw content:', JSON.stringify(fileContent))
        console.log('Content length:', fileContent.length)
        console.log('Content bytes:', Buffer.from(fileContent).toString('hex'))
        
        // Parse the content manually
        const lines = fileContent.split('\n').filter(line => line.trim())
        console.log('Parsed lines:', lines)
        
        for (const line of lines) {
          if (line.startsWith('STRIPE_SECRET_KEY=')) {
            const value = line.substring('STRIPE_SECRET_KEY='.length)
            console.log('Found STRIPE_SECRET_KEY value:', value)
            console.log('Value length:', value.length)
          }
        }
      }
    } catch (error) {
      console.error('❌ Error reading .env.local:', error)
    }
    
    console.log('=== STRIPE API DEBUG END ===')

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY is missing!')
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }

    console.log('✅ STRIPE_SECRET_KEY found, initializing Stripe...')
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return stripe
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== API HANDLER START ===')
  console.log('Request method:', req.method)
  console.log('Request headers origin:', req.headers.origin)
  
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method)
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

    console.log('🔄 Creating Stripe checkout session...')
    console.log('Price ID:', priceId)
    console.log('Supabase User ID:', supabaseUserId)
    console.log('Success URL:', `${req.headers.origin}/dashboard?success=true`)
    console.log('Cancel URL:', `${req.headers.origin}/dashboard?canceled=true`)

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

    console.log('✅ Stripe session created successfully!')
    console.log('Session ID:', session.id)
    console.log('Session URL:', session.url)
    console.log('=== API HANDLER SUCCESS ===')

    res.status(200).json({ url: session.url })
  } catch (err: any) {
    console.error('❌ Stripe session creation failed!')
    console.error('Error type:', typeof err)
    console.error('Error name:', err.name)
    console.error('Error message:', err.message)
    console.error('Error stack:', err.stack)
    console.error('Full error object:', JSON.stringify(err, null, 2))
    console.log('=== API HANDLER ERROR ===')

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