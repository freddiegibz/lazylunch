import { useEffect, useState } from 'react'

export default function TestPage() {
  const [envVars, setEnvVars] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔍 DEBUG: test.tsx - Test page loading');
    
    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV,
    }
    
    console.log('🔍 DEBUG: test.tsx - Environment check:', envCheck);
    setEnvVars(envCheck)
    setLoading(false)
  }, [])

  if (loading) {
    return <div>Loading test page...</div>
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Debug Test Page</h1>
      <p>If you can see this, basic pages are working!</p>
      
      <h2>Environment Variables:</h2>
      <ul>
        <li>Supabase URL: {envVars.hasSupabaseUrl ? '✅ Present' : '❌ Missing'}</li>
        <li>Supabase Anon Key: {envVars.hasSupabaseKey ? '✅ Present' : '❌ Missing'}</li>
        <li>Service Role Key: {envVars.hasServiceRoleKey ? '✅ Present' : '❌ Missing'}</li>
        <li>OpenAI Key: {envVars.hasOpenAIKey ? '✅ Present' : '❌ Missing'}</li>
        <li>Stripe Key: {envVars.hasStripeKey ? '✅ Present' : '❌ Missing'}</li>
        <li>Node Env: {envVars.nodeEnv}</li>
      </ul>
      
      <h2>Browser Info:</h2>
      <ul>
        <li>User Agent: {navigator.userAgent}</li>
        <li>URL: {window.location.href}</li>
      </ul>
    </div>
  )
} 