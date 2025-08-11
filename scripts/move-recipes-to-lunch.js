const fs = require('fs');
const path = require('path');

// Recipes to move from dinner to lunch
const RECIPES_TO_MOVE = [
  'chicken-tacos',
  'veggie-quesadillas', 
  'dinner-lentil-soup',
  'ham-cheese-omelette',
  'vegetable-bean-tacos'
];

// Recipes to clean up (remove "(dinner)" from name)
const RECIPES_TO_CLEAN = [
  'dinner-beef-burrito-bowl',
  'dinner-avocado-toast',
  'dinner-vegetable-stir-fry',
  'dinner-grilled-cheese-sandwich',
  'dinner-pasta-salad',
  'dinner-peanut-butter-banana-sandwich',
  'dinner-quinoa-bowl',
  'dinner-ham-cheese-panini',
  'dinner-greek-yogurt-parfait',
  'dinner-caprese-salad',
  'dinner-vegetable-soup',
  'dinner-salmon-rice-bowl',
  'dinner-spinach-feta-omelette',
  'dinner-chicken-pasta-salad',
  'dinner-mushroom-risotto',
  'dinner-beef-taco',
  'dinner-fruit-salad',
  'dinner-shrimp-stir-fry',
  'dinner-chicken-quesadilla',
  'dinner-pesto-pasta',
  'dinner-chicken-noodle-soup',
  'dinner-veggie-burger',
  'dinner-baked-potato',
  'dinner-chicken-avocado-salad',
  'dinner-egg-salad-sandwich',
  'dinner-stuffed-pepper',
  'dinner-cucumber-tomato-salad',
  'dinner-beef-stir-fry',
  'dinner-cheese-omelette',
  'dinner-tomato-soup'
];

function moveRecipesToLunch() {
  console.log('🔄 Moving recipes from dinner to lunch...\n');

  // Read the JSON files
  const dinnerPath = path.join(__dirname, '../src/lib/dinner.json');
  const lunchPath = path.join(__dirname, '../src/lib/lunch.json');
  
  const dinnerRecipes = JSON.parse(fs.readFileSync(dinnerPath, 'utf8'));
  const lunchRecipes = JSON.parse(fs.readFileSync(lunchPath, 'utf8'));

  // Find recipes to move
  const recipesToMove = dinnerRecipes.filter(recipe => RECIPES_TO_MOVE.includes(recipe.id));
  const recipesToKeep = dinnerRecipes.filter(recipe => !RECIPES_TO_MOVE.includes(recipe.id));

  // Clean up recipe names (remove "(dinner)" suffix)
  const cleanedRecipes = recipesToKeep.map(recipe => {
    if (RECIPES_TO_CLEAN.includes(recipe.id)) {
      return {
        ...recipe,
        name: recipe.name.replace(' (dinner)', '')
      };
    }
    return recipe;
  });

  // Add moved recipes to lunch
  const updatedLunchRecipes = [...lunchRecipes, ...recipesToMove];

  // Write updated files
  fs.writeFileSync(dinnerPath, JSON.stringify(cleanedRecipes, null, 2));
  fs.writeFileSync(lunchPath, JSON.stringify(updatedLunchRecipes, null, 2));

  console.log(`✅ Moved ${recipesToMove.length} recipes from dinner to lunch:`);
  recipesToMove.forEach(recipe => {
    console.log(`   - ${recipe.name}`);
  });

  console.log(`\n✅ Cleaned up ${RECIPES_TO_CLEAN.length} recipe names (removed "(dinner)" suffix)`);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Dinner recipes: ${cleanedRecipes.length} (was ${dinnerRecipes.length})`);
  console.log(`   Lunch recipes: ${updatedLunchRecipes.length} (was ${lunchRecipes.length})`);
}

moveRecipesToLunch(); 