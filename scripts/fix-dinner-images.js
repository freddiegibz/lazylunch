const fs = require('fs');
const path = require('path');

const dinnerFile = '../src/lib/dinner.json';

function fixDinnerImages() {
  console.log('🔧 Fixing dinner.json image references...\n');
  
  const fullPath = path.join(__dirname, dinnerFile);
  const recipes = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  
  let updatedCount = 0;
  
  recipes.forEach(recipe => {
    if (recipe.image) {
      // Check if it's an old PNG reference
      if (recipe.image.includes('/images/') && recipe.image.endsWith('.png')) {
        // Extract the filename and convert to WebP
        const oldFilename = recipe.image.split('/').pop();
        const newFilename = oldFilename.replace('.png', '.webp');
        recipe.image = `/foodimageswebp/${newFilename}`;
        updatedCount++;
        console.log(`  ✅ Updated: ${recipe.name} -> ${newFilename}`);
      }
    }
  });
  
  // Write updated recipes back to file
  fs.writeFileSync(fullPath, JSON.stringify(recipes, null, 2));
  
  console.log(`\n🎯 Updated ${updatedCount} image references in dinner.json`);
  console.log('💡 All dinner recipes now use WebP images!');
}

fixDinnerImages(); 