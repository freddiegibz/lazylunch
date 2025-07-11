import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const supabaseUrl = 'https://agegxqyzrvnykxfmaycq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // (truncated for brevity)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Auth: get user from Supabase token
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

  // 2. Enforce 5 meal plan/week limit for standard members
  // (Assume membership is in user.user_metadata.membership or fetch from profiles table)
  let membership = user.user_metadata?.membership;
  if (!membership) {
    // Try to fetch from profiles table
    const { data: profile } = await supabase.from('profiles').select('membership').eq('id', user.id).single();
    membership = profile?.membership || 'free';
  }
  if (membership === 'standard') {
    const { data: plans, error: plansError } = await supabase
      .from('meal_plans')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (plansError) return res.status(500).json({ error: 'Failed to check plan limit' });
    if (plans.length >= 5) {
      // Find the oldest plan in the last 7 days
      const oldest = plans.map(p => new Date(p.created_at)).sort((a, b) => a.getTime() - b.getTime())[0];
      const nextAllowed = new Date(oldest.getTime() + 7 * 24 * 60 * 60 * 1000);
      const msLeft = nextAllowed.getTime() - Date.now();
      return res.status(429).json({ error: 'Meal plan limit reached', msLeft });
    }
  }

  // 3. Read and combine all recipes
  const breakfastRaw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/breakfast.json'), 'utf8'));
  const lunchRaw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/lunch.json'), 'utf8'));
  const dinnerRaw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/dinner.json'), 'utf8'));

  // Add 'type' field to each recipe
  const breakfast = breakfastRaw.map((r: any) => ({ ...r, type: 'breakfast' }));
  const lunch = lunchRaw.map((r: any) => ({ ...r, type: 'lunch' }));
  const dinner = dinnerRaw.map((r: any) => ({ ...r, type: 'dinner' }));
  const allRecipes = [...breakfast, ...lunch, ...dinner];

  // 4. Read the prompt template
  const promptPath = path.join(process.cwd(), 'src/lib/mealplan-chatgpt-prompt.txt');
  let promptTemplate = await fs.readFile(promptPath, 'utf8');

  // 5. Gather user personalization and feedback from Supabase
  // --- User Preferences ---
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('servings, focus, allergens, dietaryRestrictions, cuisine, otherPreferences, weeklyBudget')
    .eq('id', user.id)
    .single();

  if (profileError) return res.status(500).json({ error: 'Failed to fetch user preferences' });

  const userData = {
    servings: profile?.servings ?? 2,
    focus: profile?.focus ?? 'variety',
    allergens: profile?.allergens ?? [],
    dietaryRestrictions: profile?.dietaryRestrictions ?? [],
    cuisine: profile?.cuisine ?? [],
    otherPreferences: profile?.otherPreferences ?? [],
    weeklyBudget: profile?.weeklyBudget ?? null,
  };

  // --- User Feedback ---
  const { data: feedbackRows, error: feedbackError } = await supabase
    .from('recipe_feedback')
    .select('recipe_id, feedback')
    .eq('user_id', user.id);

  if (feedbackError) return res.status(500).json({ error: 'Failed to fetch user feedback' });

  const userFeedback = {
    likes: feedbackRows.filter(f => f.feedback === 'like').map(f => f.recipe_id),
    dislikes: feedbackRows.filter(f => f.feedback === 'dislike').map(f => f.recipe_id),
  };

  // 6. Fill in the template (simple replace, you may want a real template engine)
  let prompt = promptTemplate
    .replace('[user.servings]', userData.servings)
    .replace('[user.focus]', userData.focus)
    .replace('[user.allergens]', JSON.stringify(userData.allergens))
    .replace('[user.dietaryRestrictions]', JSON.stringify(userData.dietaryRestrictions))
    .replace('[user.cuisine]', JSON.stringify(userData.cuisine))
    .replace('[user.otherPreferences]', JSON.stringify(userData.otherPreferences))
    .replace('[user.weeklyBudget]', userData.weeklyBudget)
    .replace('[user.likedRecipes]', JSON.stringify(userFeedback.likes))
    .replace('[user.dislikedRecipes]', JSON.stringify(userFeedback.dislikes))
    .replace('[Insert JSON array of all available recipes here]', JSON.stringify(allRecipes, null, 2));

  // 7. Send to OpenAI
  const openaiRes = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
  });

  // 8. Return the generated plan
  res.status(200).json({ plan: openaiRes.choices[0].message.content });
} 