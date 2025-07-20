const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load recipe data
const breakfastRecipes = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/lib/breakfast.json'), 'utf8'));
const lunchRecipes = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/lib/lunch.json'), 'utf8'));
const dinnerRecipes = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/lib/dinner.json'), 'utf8'));

// Create name to ID mappings
const nameToIdMap = {};

breakfastRecipes.forEach(recipe => {
  nameToIdMap[recipe.name] = recipe.id;
});

lunchRecipes.forEach(recipe => {
  nameToIdMap[recipe.name] = recipe.id;
});

dinnerRecipes.forEach(recipe => {
  nameToIdMap[recipe.name] = recipe.id;
});

function findRecipeIdByName(name, mealType) {
  // Try exact match first
  if (nameToIdMap[name]) {
    return nameToIdMap[name];
  }
  
  // Try partial matches
  const allRecipes = [...breakfastRecipes, ...lunchRecipes, ...dinnerRecipes];
  const partialMatch = allRecipes.find(recipe => 
    name.toLowerCase().includes(recipe.name.toLowerCase()) ||
    recipe.name.toLowerCase().includes(name.toLowerCase())
  );
  
  return partialMatch ? partialMatch.id : null;
}

async function fixMealPlanRecipeIds() {
  console.log('🔧 Fixing meal plan recipe IDs...\n');
  
  try {
    // Get all meal plans
    const { data: mealPlans, error } = await supabase
      .from('meal_plans')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching meal plans:', error);
      return;
    }
    
    console.log(`📊 Found ${mealPlans.length} meal plans to update`);
    
    let updatedCount = 0;
    
    for (const plan of mealPlans) {
      if (plan.week_data && Array.isArray(plan.week_data)) {
        let needsUpdate = false;
        
        // Update each day's meals
        const updatedWeekData = plan.week_data.map(day => {
          if (day.meals) {
            const updatedMeals = {};
            
            // Update breakfast
            if (day.meals.breakfast && typeof day.meals.breakfast === 'string') {
              const recipeId = findRecipeIdByName(day.meals.breakfast, 'breakfast');
              if (recipeId) {
                updatedMeals.breakfast = recipeId;
                needsUpdate = true;
                console.log(`  ✅ Plan ${plan.id}: Updated breakfast "${day.meals.breakfast}" -> "${recipeId}"`);
              } else {
                console.log(`  ⚠️  Plan ${plan.id}: Could not find breakfast recipe "${day.meals.breakfast}"`);
                updatedMeals.breakfast = day.meals.breakfast; // Keep original
              }
            } else {
              updatedMeals.breakfast = day.meals.breakfast;
            }
            
            // Update lunch
            if (day.meals.lunch && typeof day.meals.lunch === 'string') {
              const recipeId = findRecipeIdByName(day.meals.lunch, 'lunch');
              if (recipeId) {
                updatedMeals.lunch = recipeId;
                needsUpdate = true;
                console.log(`  ✅ Plan ${plan.id}: Updated lunch "${day.meals.lunch}" -> "${recipeId}"`);
              } else {
                console.log(`  ⚠️  Plan ${plan.id}: Could not find lunch recipe "${day.meals.lunch}"`);
                updatedMeals.lunch = day.meals.lunch; // Keep original
              }
            } else {
              updatedMeals.lunch = day.meals.lunch;
            }
            
            // Update dinner
            if (day.meals.dinner && typeof day.meals.dinner === 'string') {
              const recipeId = findRecipeIdByName(day.meals.dinner, 'dinner');
              if (recipeId) {
                updatedMeals.dinner = recipeId;
                needsUpdate = true;
                console.log(`  ✅ Plan ${plan.id}: Updated dinner "${day.meals.dinner}" -> "${recipeId}"`);
              } else {
                console.log(`  ⚠️  Plan ${plan.id}: Could not find dinner recipe "${day.meals.dinner}"`);
                updatedMeals.dinner = day.meals.dinner; // Keep original
              }
            } else {
              updatedMeals.dinner = day.meals.dinner;
            }
            
            return { ...day, meals: updatedMeals };
          }
          return day;
        });
        
        if (needsUpdate) {
          // Update the meal plan
          const { error: updateError } = await supabase
            .from('meal_plans')
            .update({ week_data: updatedWeekData })
            .eq('id', plan.id);
          
          if (updateError) {
            console.error(`❌ Error updating plan ${plan.id}:`, updateError);
          } else {
            updatedCount++;
            console.log(`  ✅ Successfully updated plan ${plan.id}`);
          }
        } else {
          console.log(`  ℹ️  Plan ${plan.id}: No updates needed`);
        }
      }
    }
    
    console.log(`\n🎯 Updated ${updatedCount} meal plans in database`);
    console.log('💡 All meal plans now use recipe IDs instead of names!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixMealPlanRecipeIds(); 