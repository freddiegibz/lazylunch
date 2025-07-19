const fs = require('fs');
const path = require('path');

const recipeFiles = [
  '../src/lib/breakfast.json',
  '../src/lib/lunch.json', 
  '../src/lib/dinner.json'
];

function updateRecipeImages() {
  console.log('🔄 Updating recipe images to use WebP format...\n');
  
  recipeFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const recipes = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    let updatedCount = 0;
    
    recipes.forEach(recipe => {
      if (recipe.image && recipe.image.includes('/foodimages/')) {
        // Update image path from PNG to WebP
        recipe.image = recipe.image.replace('/foodimages/', '/foodimageswebp/').replace('.png', '.webp');
        updatedCount++;
      }
    });
    
    // Write updated recipes back to file
    fs.writeFileSync(fullPath, JSON.stringify(recipes, null, 2));
    
    console.log(`✅ Updated ${updatedCount} images in ${path.basename(filePath)}`);
  });
  
  console.log('\n🎯 All recipe images updated to use WebP format!');
  console.log('💡 Next: Delete old PNG images to save space');
}

updateRecipeImages(); 