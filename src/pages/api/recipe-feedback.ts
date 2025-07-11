import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = 'https://agegxqyzrvnykxfmaycq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZWd4cXl6cnZueWt4Zm1heWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTU1MjQsImV4cCI6MjA2NzIzMTUyNH0.SisaTROwc4-lGljFql28OoWXCVeeYc2aEQJ9-8jcJx0';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { recipe_id, feedback } = req.body;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) return res.status(401).json({ error: 'Not authenticated' });

  if (!recipe_id || !['like', 'dislike'].includes(feedback)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { error } = await supabase
    .from('recipe_feedback')
    .upsert([{ user_id: user.id, recipe_id, feedback }], { onConflict: 'user_id,recipe_id' });

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ success: true });
} 