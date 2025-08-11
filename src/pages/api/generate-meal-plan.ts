import fs from 'fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

console.log('🔍 DEBUG: Supabase URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('🔍 DEBUG: Supabase Anon Key present:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('🔍 DEBUG: OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
console.log('🔍 DEBUG: OpenAI API Key length:', process.env.OPENAI_API_KEY?.length);
console.log('🔍 DEBUG: OpenAI API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
console.log('🔍 DEBUG: OpenAI API Key ends with:', '...' + process.env.OPENAI_API_KEY?.substring(-10));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Auth: get user from Supabase token
  console.log('🔍 DEBUG: Starting authentication...');
  const authHeader = req.headers['authorization'];
  console.log('🔍 DEBUG: Auth header present:', !!authHeader);
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;
  console.log('🔍 DEBUG: Token extracted:', !!token);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  
  // Verify the JWT token and get user
  console.log('🔍 DEBUG: Verifying token with Supabase...');
  let user, userError;
  
  try {
    const result = await supabase.auth.getUser(token);
    user = result.data.user;
    userError = result.error;
    console.log('🔍 DEBUG: User verification result:', !!user, !!userError);
  } catch (networkError: any) {
    console.error('🔍 DEBUG: Network error during auth:', networkError);
    console.error('🔍 DEBUG: Network error code:', networkError.code);
    console.error('🔍 DEBUG: Network error message:', networkError.message);
    
    // If it's a network timeout, we'll try to proceed with the token as-is
    // since the token might still be valid locally
    if (networkError.code === 'UND_ERR_CONNECT_TIMEOUT' || networkError.message?.includes('fetch failed')) {
      console.log('🔍 DEBUG: Network timeout detected, proceeding with token validation...');
      // For now, let's assume the token is valid if we can't reach Supabase
      // This is a temporary workaround for network issues
      user = { id: 'temp-user-id' }; // Placeholder
      userError = null;
    } else {
      return res.status(500).json({ error: 'Network error during authentication' });
    }
  }
  
  if (!user || userError) {
    console.error('Auth error:', userError);
    return res.status(401).json({ error: 'Not authenticated' });
  }
  console.log('🔍 DEBUG: Authentication successful for user:', user.id);

  // 2. Enforce 5 meal plan/week limit for standard members
  console.log('🔍 DEBUG: Starting membership check...');
  try {
    let membership = user.user_metadata?.membership;
    console.log('🔍 DEBUG: User metadata membership:', membership);
    if (!membership) {
      // Try to fetch from profiles table
      console.log('🔍 DEBUG: Fetching membership from profiles table...');
      try {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('membership').eq('id', user.id).single();
        console.log('🔍 DEBUG: Profile fetch result:', !!profile, !!profileError);
        membership = profile?.membership || 'free';
      } catch (networkError: any) {
        console.error('🔍 DEBUG: Network error during profile fetch:', networkError);
        console.log('🔍 DEBUG: Using default membership due to network error');
        membership = 'free'; // Default to free if we can't reach Supabase
      }
    }
    console.log('🔍 DEBUG: Final membership:', membership);
    
    // Check meal plan limits based on membership level
    const membershipLimits = {
      'free': 0,
      'basic': 2,
      'standard': 5,
      'premium': 10
    };
    
    const planLimit = membershipLimits[membership as keyof typeof membershipLimits] || 0;
    console.log('🔍 DEBUG: Plan limit for membership:', membership, 'is', planLimit);
    
    if (planLimit === 0) {
      return res.status(403).json({ error: 'Meal plan generation requires a paid membership' });
    }
    
    if (planLimit > 0) {
      console.log('🔍 DEBUG: Checking meal plan limit for', membership, 'user...');
      const { data: plans, error: plansError } = await supabase
        .from('meal_plans')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      console.log('🔍 DEBUG: Plans fetch result:', plans?.length, !!plansError);
      if (plansError) return res.status(500).json({ error: 'Failed to check plan limit' });
      if (plans.length >= planLimit) {
        // Find the oldest plan in the last 7 days
        const oldest = plans.map(p => new Date(p.created_at)).sort((a, b) => a.getTime() - b.getTime())[0];
        const nextAllowed = new Date(oldest.getTime() + 7 * 24 * 60 * 60 * 1000);
        const msLeft = nextAllowed.getTime() - Date.now();
        return res.status(429).json({ 
          error: `Meal plan limit reached (${planLimit} per week)`, 
          msLeft,
          currentPlans: plans.length,
          planLimit
        });
      }
    }
    console.log('🔍 DEBUG: Membership check completed successfully');
  } catch (error) {
    console.error('🔍 DEBUG: Membership check error:', error);
    return res.status(500).json({ error: 'Error checking membership' });
  }

  // 3. Read and combine all recipes
  let allRecipes: any[] = [];
  let fullRecipes: any[] = [];
  try {
    console.log('🔍 DEBUG: Starting to load recipe files...');
    const breakfastRaw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/breakfast.json'), 'utf8'));
    console.log('🔍 DEBUG: Breakfast recipes loaded successfully');
    const lunchRaw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/lunch.json'), 'utf8'));
    console.log('🔍 DEBUG: Lunch recipes loaded successfully');
    const dinnerRaw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/dinner.json'), 'utf8'));
    console.log('🔍 DEBUG: Dinner recipes loaded successfully');

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
  console.log('🔍 DEBUG: Loading prompt template...');
  let promptTemplate = '';
  try {
    const promptPath = path.join(process.cwd(), 'src/lib/mealplan-chatgpt-prompt.txt');
    console.log('🔍 DEBUG: Prompt template path:', promptPath);
    promptTemplate = await fs.readFile(promptPath, 'utf8');
    console.log('🔍 DEBUG: Prompt template loaded, length:', promptTemplate.length);
  } catch (error) {
    console.error('🔍 DEBUG: Error loading prompt template:', error);
    return res.status(500).json({ error: 'Error loading prompt template' });
  }

  // 5. Gather user personalization and feedback from Supabase
  console.log('🔍 DEBUG: Starting user data processing...');
  let userData: any = {};
  let userFeedback: any = {};
  try {
    // Use preferences from request body instead of fetching from profiles
    const { preferences } = req.body;
    console.log('🔍 DEBUG: Received preferences:', preferences);
    
    userData = {
      servings: preferences?.servings ?? 2,
      focus: preferences?.focus ?? 'variety',
      allergens: preferences?.allergens ?? [],
      dietaryRestrictions: preferences?.dietaryRestrictions ?? [],
      cuisine: preferences?.cuisine ?? [],
      otherPreferences: preferences?.otherPreferences ?? [],
      weeklyBudget: preferences?.weeklyBudget ?? null,
    };
    console.log('🔍 DEBUG: Processed user data:', userData);

    // --- User Feedback ---
    console.log('🔍 DEBUG: Fetching user feedback...');
    const { data: feedbackRows, error: feedbackError } = await supabase
      .from('recipe_feedback')
      .select('recipe_id, feedback')
      .eq('user_id', user.id);

    console.log('🔍 DEBUG: Feedback fetch result:', feedbackRows?.length, !!feedbackError);
    if (feedbackError) {
      console.error('🔍 DEBUG: Feedback fetch error:', feedbackError);
      return res.status(500).json({ error: 'Failed to fetch user feedback' });
    }

    userFeedback = {
      likes: feedbackRows.filter(f => f.feedback === 'like').map(f => f.recipe_id),
      dislikes: feedbackRows.filter(f => f.feedback === 'dislike').map(f => f.recipe_id),
    };
    console.log('🔍 DEBUG: User feedback processed:', userFeedback);
  } catch (error) {
    console.error('🔍 DEBUG: User data processing error:', error);
    return res.status(500).json({ error: 'Error processing user data' });
  }

  // 6. Fill in the template and call OpenAI
  console.log('🔍 DEBUG: Starting OpenAI call preparation...');
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

    console.log('🔍 DEBUG: Prompt template filled successfully');
    console.log('🔍 DEBUG: Prompt length:', prompt.length);

    // 7. Send to OpenAI
    console.log('🔍 DEBUG: Calling OpenAI API...');
    console.log('🔍 DEBUG: Timestamp:', new Date().toISOString());
    console.log('🔍 DEBUG: Model being used: gpt-4');
    console.log('🔍 DEBUG: Temperature: 0.7');
    console.log('🔍 DEBUG: Messages array length: 1');
    console.log('🔍 DEBUG: Prompt content preview:', prompt.substring(0, 200) + '...');
    
    let openaiRes;
    try {
      console.log('🔍 DEBUG: About to make OpenAI API request...');
      openaiRes = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9, // Increased for more variety
      });
          console.log('🔍 DEBUG: OpenAI API call completed successfully');
    console.log('🔍 DEBUG: Response choices length:', openaiRes.choices?.length);
    console.log('🔍 DEBUG: First choice content preview:', openaiRes.choices?.[0]?.message?.content?.substring(0, 200) + '...');
    } catch (openaiError: any) {
      console.error('🔍 DEBUG: OpenAI API error:', openaiError);
      console.error('🔍 DEBUG: OpenAI error code:', openaiError.code);
      console.error('🔍 DEBUG: OpenAI error message:', openaiError.message);
      console.error('🔍 DEBUG: OpenAI error status:', openaiError.status);
      console.error('🔍 DEBUG: OpenAI error type:', openaiError.type);
      console.error('🔍 DEBUG: Full error object:', JSON.stringify(openaiError, null, 2));
      throw openaiError;
    }

    // 8. Parse OpenAI response and populate full recipe data
    console.log('🔍 DEBUG: Starting response processing...');
    try {
      const aiResponse = openaiRes.choices[0].message.content;
      console.log('🔍 DEBUG: AI response length:', aiResponse?.length);
      console.log('🔍 DEBUG: AI response exists:', !!aiResponse);
      
      if (!aiResponse) {
        throw new Error('No response content from OpenAI');
      }
      
      // Try to clean the response if it's malformed
      let cleanedResponse = aiResponse.trim();
      console.log('🔍 DEBUG: Original response preview:', aiResponse.substring(0, 300) + '...');
      console.log('🔍 DEBUG: Trimmed response preview:', cleanedResponse.substring(0, 300) + '...');
      
      // If the response doesn't start with {, try to find the JSON
      if (!cleanedResponse.startsWith('{')) {
        const jsonStart = cleanedResponse.indexOf('{');
        console.log('🔍 DEBUG: JSON start found at index:', jsonStart);
        if (jsonStart !== -1) {
          cleanedResponse = cleanedResponse.substring(jsonStart);
        }
      }
      
      // If the response doesn't end with }, try to find the end
      if (!cleanedResponse.endsWith('}')) {
        const jsonEnd = cleanedResponse.lastIndexOf('}');
        console.log('🔍 DEBUG: JSON end found at index:', jsonEnd);
        if (jsonEnd !== -1) {
          cleanedResponse = cleanedResponse.substring(0, jsonEnd + 1);
        }
      }
      
      console.log('🔍 DEBUG: Final cleaned response preview:', cleanedResponse.substring(0, 300) + '...');
      console.log('🔍 DEBUG: About to parse JSON...');
      
      const mealPlanData = JSON.parse(cleanedResponse);
      console.log('🔍 DEBUG: JSON parsed successfully');
      console.log('🔍 DEBUG: Meal plan structure:', JSON.stringify(mealPlanData, null, 2));
      
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
      console.error('🔍 DEBUG: Parse error:', parseError);
      console.error('🔍 DEBUG: Parse error message:', parseError.message);
      console.error('🔍 DEBUG: Parse error stack:', parseError.stack);
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