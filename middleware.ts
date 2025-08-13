import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

// Limit middleware to app routes; exclude Next static/dev assets
export const config = {
  matcher: [
    // All paths except Next.js internals and static files
    '/((?!_next|favicon\.ico|site\.webmanifest|images|public).*)',
  ],
} 