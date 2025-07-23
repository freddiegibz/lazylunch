import fs from 'fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Auth: get user from Supabase token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  
  // Use the same supabase client as frontend
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (!user || userError) return res.status(401).json({ error: 'Not authenticated' });

  // 2. Enforce 5 meal plan/week limit for standard members
  try {
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
  } catch (error) {
    return res.status(500).json({ error: 'Error checking membership' });
  }

  // 3. Read and combine all recipes
  let allRecipes: any[] = [];
  let fullRecipes: any[] = [];
  try {
    const breakfastRaw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/breakfast.json'), 'utf8'));
    const lunchRaw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/lunch.json'), 'utf8'));
    const dinnerRaw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/dinner.json'), 'utf8'));

    // Store full recipes for later use
    const breakfast = breakfastRaw.map((r: any) => ({ ...r, type: 'breakfast' }));
    const lunch = lunchRaw.map((r: any) => ({ ...r, type: 'lunch' }));
    const dinner = dinnerRaw.map((r: any) => ({ ...r, type: 'dinner' }));
    fullRecipes = [...breakfast, ...lunch, ...dinner];
    
    // Debug: Log recipe counts and some sample recipes
    console.log(`🔍 DEBUG: Loaded ${breakfast.length} breakfast recipes, ${lunch.length} lunch recipes, ${dinner.length} dinner recipes`);
    console.log(`🔍 DEBUG: Sample breakfast recipes:`, breakfast.slice(0, 3).map((r: any) => r.name));
    console.log(`🔍 DEBUG: Sample lunch recipes:`, lunch.slice(0, 3).map((r: any) => r.name));
    console.log(`🔍 DEBUG: Sample dinner recipes:`, dinner.slice(0, 3).map((r: any) => r.name));
    
    // Create minimal recipe list for OpenAI (just id, name, type)
    allRecipes = fullRecipes.map((r: any) => ({ 
      id: r.id, 
      name: r.name, 
      type: r.type 
    }));
  } catch (error) {
    return res.status(500).json({ error: 'Error loading recipes' });
  }

  // 4. Read the prompt template
  let promptTemplate = '';
  try {
    const promptPath = path.join(process.cwd(), 'src/lib/mealplan-chatgpt-prompt.txt');
    promptTemplate = await fs.readFile(promptPath, 'utf8');
  } catch (error) {
    return res.status(500).json({ error: 'Error loading prompt template' });
  }

  // 5. Gather user personalization and feedback from Supabase
  let userData: any = {};
  let userFeedback: any = {};
  try {
    // Use preferences from request body instead of fetching from profiles
    const { preferences } = req.body;
    
    userData = {
      servings: preferences?.servings ?? 2,
      focus: preferences?.focus ?? 'variety',
      allergens: preferences?.allergens ?? [],
      dietaryRestrictions: preferences?.dietaryRestrictions ?? [],
      cuisine: preferences?.cuisine ?? [],
      otherPreferences: preferences?.otherPreferences ?? [],
      weeklyBudget: preferences?.weeklyBudget ?? null,
    };

    // --- User Feedback ---
    const { data: feedbackRows, error: feedbackError } = await supabase
      .from('recipe_feedback')
      .select('recipe_id, feedback')
      .eq('user_id', user.id);

    if (feedbackError) {
      return res.status(500).json({ error: 'Failed to fetch user feedback' });
    }

    userFeedback = {
      likes: feedbackRows.filter(f => f.feedback === 'like').map(f => f.recipe_id),
      dislikes: feedbackRows.filter(f => f.feedback === 'dislike').map(f => f.recipe_id),
    };
  } catch (error) {
    return res.status(500).json({ error: 'Error processing user data' });
  }

  // 6. Fill in the template and call OpenAI
  try {
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

    // 8. Parse OpenAI response and populate full recipe data
    try {
      const aiResponse = openaiRes.choices[0].message.content;
      if (!aiResponse) {
        throw new Error('No response content from OpenAI');
      }
      
      // Try to clean the response if it's malformed
      let cleanedResponse = aiResponse.trim();
      
      // If the response doesn't start with {, try to find the JSON
      if (!cleanedResponse.startsWith('{')) {
        const jsonStart = cleanedResponse.indexOf('{');
        if (jsonStart !== -1) {
          cleanedResponse = cleanedResponse.substring(jsonStart);
        }
      }
      
      // If the response doesn't end with }, try to find the end
      if (!cleanedResponse.endsWith('}')) {
        const jsonEnd = cleanedResponse.lastIndexOf('}');
        if (jsonEnd !== -1) {
          cleanedResponse = cleanedResponse.substring(0, jsonEnd + 1);
        }
      }
      
      const mealPlanData = JSON.parse(cleanedResponse);
      
      // Populate full recipe data for each meal
      const populatedWeek = mealPlanData.week.map((day: any) => ({
        ...day,
        meals: {
          breakfast: fullRecipes.find(r => r.id === day.meals.breakfast.recipeId) || day.meals.breakfast,
          lunch: fullRecipes.find(r => r.id === day.meals.lunch.recipeId) || day.meals.lunch,
          dinner: fullRecipes.find(r => r.id === day.meals.dinner.recipeId) || day.meals.dinner
        }
      }));
      
      const finalMealPlan = {
        ...mealPlanData,
        week: populatedWeek
      };
      
      res.status(200).json({ plan: finalMealPlan });
    } catch (parseError: any) {
      return res.status(500).json({ 
        error: 'Error processing AI response. Please try again.',
        details: parseError.message 
      });
    }
  } catch (error: any) {
    
    // Handle specific OpenAI errors
    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({ 
        error: 'OpenAI rate limit exceeded. Please try again in a few minutes.',
        retryAfter: error.headers?.['x-ratelimit-reset-tokens'] || 60
      });
    }
    
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ 
        error: 'OpenAI quota exceeded. Please check your API billing.'
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        error: 'OpenAI API key is invalid or missing.'
      });
    }
    
    return res.status(500).json({ 
      error: 'Error generating meal plan with AI. Please try again.',
      details: error.message 
    });
  }
} 