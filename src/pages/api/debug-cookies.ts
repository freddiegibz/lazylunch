import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('DEBUG API: All headers:', req.headers)
  console.log('DEBUG API: Cookie header:', req.headers.cookie)
  console.log('DEBUG API: User-Agent:', req.headers['user-agent'])
  console.log('DEBUG API: Host:', req.headers.host)
  console.log('DEBUG API: Origin:', req.headers.origin)
  console.log('DEBUG API: Referer:', req.headers.referer)
  
  res.status(200).json({ 
    cookies: req.headers.cookie || 'No cookies received',
    headers: Object.keys(req.headers),
    hasCookieHeader: !!req.headers.cookie
  })
} 