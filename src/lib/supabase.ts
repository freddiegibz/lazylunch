import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

console.log('DEBUG: NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('DEBUG: NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
 
export const supabase = createClientComponentClient() 