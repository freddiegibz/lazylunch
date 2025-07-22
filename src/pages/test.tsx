import { useEffect, useState } from 'react'
import { GetServerSideProps } from 'next'

interface TestPageProps {
  serverEnvVars: {
    hasServiceRoleKey: boolean
    hasOpenAIKey: boolean
    hasStripeKey: boolean
    nodeEnv: string
  }
}

export const getServerSideProps: GetServerSideProps<TestPageProps> = async () => {
  console.log('🔍 DEBUG: test.tsx - getServerSideProps running');
  
  // Check server-side environment variables
  const serverEnvVars = {
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    nodeEnv: process.env.NODE_ENV || 'unknown',
  }
  
  console.log('🔍 DEBUG: test.tsx - Server env vars:', serverEnvVars);
  
  return {
    props: {
      serverEnvVars,
    },
  }
}

export default function TestPage({ serverEnvVars }: TestPageProps) {
  const [clientEnvVars, setClientEnvVars] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔍 DEBUG: test.tsx - Client-side useEffect running');
    
    // Check client-side environment variables (only NEXT_PUBLIC_ ones)
    const clientEnvCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      // Note: These won't be available client-side
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV,
    }
    
    console.log('🔍 DEBUG: test.tsx - Client env check:', clientEnvCheck);
    setClientEnvVars(clientEnvCheck)
    setLoading(false)
  }, [])

  if (loading) {
    return <div>Loading test page...</div>
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Debug Test Page</h1>
      <p>If you can see this, basic pages are working!</p>
      
      <h2>🔧 Server-Side Environment Variables (getServerSideProps):</h2>
      <ul>
        <li>Service Role Key: {serverEnvVars.hasServiceRoleKey ? '✅ Present' : '❌ Missing'}</li>
        <li>OpenAI Key: {serverEnvVars.hasOpenAIKey ? '✅ Present' : '❌ Missing'}</li>
        <li>Stripe Key: {serverEnvVars.hasStripeKey ? '✅ Present' : '❌ Missing'}</li>
        <li>Node Env: {serverEnvVars.nodeEnv}</li>
      </ul>
      
      <h2>🌐 Client-Side Environment Variables (useEffect):</h2>
      <ul>
        <li>Supabase URL: {clientEnvVars.hasSupabaseUrl ? '✅ Present' : '❌ Missing'}</li>
        <li>Supabase Anon Key: {clientEnvVars.hasSupabaseKey ? '✅ Present' : '❌ Missing'}</li>
        <li>Service Role Key: {clientEnvVars.hasServiceRoleKey ? '✅ Present' : '❌ Missing'}</li>
        <li>OpenAI Key: {clientEnvVars.hasOpenAIKey ? '✅ Present' : '❌ Missing'}</li>
        <li>Stripe Key: {clientEnvVars.hasStripeKey ? '✅ Present' : '❌ Missing'}</li>
        <li>Node Env: {clientEnvVars.nodeEnv}</li>
      </ul>
      
      <h2>📊 Summary:</h2>
      <ul>
        <li>✅ Client-side variables (NEXT_PUBLIC_*) should work in both</li>
        <li>❌ Server-side variables should only work in Server-Side section</li>
        <li>🔧 If Server-Side shows ❌, the variables are missing from Vercel</li>
        <li>🌐 If Client-Side shows ❌ for server variables, that's normal</li>
      </ul>
      
      <h2>Browser Info:</h2>
      <ul>
        <li>User Agent: {navigator.userAgent}</li>
        <li>URL: {window.location.href}</li>
      </ul>
    </div>
  )
} 