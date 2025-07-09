import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://agegxqyzrvnykxfmaycq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZWd4cXl6cnZueWt4Zm1heWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTU1MjQsImV4cCI6MjA2NzIzMTUyNH0.SisaTROwc4-lGljFql28OoWXCVeeYc2aEQJ9-8jcJx0'
 
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 