const fs = require('fs');
const path = require('path');

const recipeFiles = [
  '../src/lib/breakfast.json',
  '../src/lib/lunch.json', 
  '../src/lib/dinner.json'
];

function makeIdsUnique() {
  console.log('🔑 Making recipe IDs unique across all files...\n');
  
  // First, collect all existing IDs to check for conflicts
  const allIds = new Set();
  const fileRecipes = [];
  
  recipeFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const recipes = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    fileRecipes.push({ filePath, recipes });
    
    recipes.forEach(recipe => {
      allIds.add(recipe.id);
    });
  });
  
  console.log(`📊 Found ${allIds.size} unique IDs across all files\n`);
  
  // Now fix any conflicts by adding meal type prefix
  fileRecipes.forEach(({ filePath, recipes }) => {
    const mealType = path.basename(filePath, '.json'); // breakfast, lunch, or dinner
    let changedCount = 0;
    
    recipes.forEach(recipe => {
      const originalId = recipe.id;
      
      // Check if this ID exists in other files
      const conflicts = fileRecipes.filter(({ recipes: otherRecipes }) => 
        otherRecipes.some(otherRecipe => 
          otherRecipe.id === originalId && 
          otherRecipe.name !== recipe.name
        )
      );
      
      if (conflicts.length > 0) {
        // Make the ID unique by adding meal type prefix
        const newId = `${mealType}-${originalId}`;
        recipe.id = newId;
        console.log(`  🔄 Fixed ID conflict: "${recipe.name}" ${originalId} → ${newId}`);
        changedCount++;
      }
    });
    
    // Write updated recipes back to file
    const fullPath = path.join(__dirname, filePath);
    fs.writeFileSync(fullPath, JSON.stringify(recipes, null, 2));
    
    console.log(`  📄 ${path.basename(filePath)}: ${changedCount} IDs updated\n`);
  });
  
  console.log('🎯 All recipe IDs are now unique!');
}

makeIdsUnique(); 