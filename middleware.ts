import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('🔍 DEBUG: middleware - Processing request for:', req.url);
  
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    console.log('🔍 DEBUG: middleware - Getting session...');
    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-user-with-client-components
    await supabase.auth.getSession()
    console.log('🔍 DEBUG: middleware - Session processed successfully');
  } catch (error) {
    console.log('🔍 DEBUG: middleware - Error getting session:', error);
  }

  return res
} 