const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMealPlanImages() {
  console.log('🔧 Fixing meal plan images in database...\n');
  
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
              // This is a recipe ID, we need to get the recipe and update its image
              const recipeId = day.meals.breakfast;
              // For now, just log what we find
              console.log(`  📝 Plan ${plan.id}: Breakfast recipe ID: ${recipeId}`);
            }
            
            // Update lunch
            if (day.meals.lunch && typeof day.meals.lunch === 'string') {
              const recipeId = day.meals.lunch;
              console.log(`  📝 Plan ${plan.id}: Lunch recipe ID: ${recipeId}`);
            }
            
            // Update dinner
            if (day.meals.dinner && typeof day.meals.dinner === 'string') {
              const recipeId = day.meals.dinner;
              console.log(`  📝 Plan ${plan.id}: Dinner recipe ID: ${recipeId}`);
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
            console.log(`  ✅ Updated plan ${plan.id}`);
          }
        }
      }
    }
    
    console.log(`\n🎯 Updated ${updatedCount} meal plans`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixMealPlanImages(); 