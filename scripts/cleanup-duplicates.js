const fs = require('fs');
const path = require('path');

const recipeFiles = [
  '../src/lib/breakfast.json',
  '../src/lib/lunch.json', 
  '../src/lib/dinner.json'
];

function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate recipes and fixing image paths...\n');
  
  recipeFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const recipes = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    console.log(`📄 Processing ${path.basename(filePath)}...`);
    
    // Remove duplicates based on recipe name
    const uniqueRecipes = [];
    const seenNames = new Set();
    
    recipes.forEach(recipe => {
      if (!seenNames.has(recipe.name)) {
        seenNames.add(recipe.name);
        uniqueRecipes.push(recipe);
      } else {
        console.log(`  ❌ Removed duplicate: ${recipe.name}`);
      }
    });
    
    // Fix image paths
    let fixedCount = 0;
    uniqueRecipes.forEach(recipe => {
      if (recipe.image) {
        // Fix paths that use /foodimages/ instead of /foodimageswebp/
        if (recipe.image.includes('/foodimages/')) {
          recipe.image = recipe.image.replace('/foodimages/', '/foodimageswebp/');
          fixedCount++;
        }
        
        // Fix .png extensions to .webp for files that exist as .webp
        if (recipe.image.endsWith('.png')) {
          const webpPath = recipe.image.replace('.png', '.webp');
          // Check if the .webp file exists
          const webpFile = path.join(__dirname, '..', 'public', webpPath.substring(1));
          if (fs.existsSync(webpFile)) {
            recipe.image = webpPath;
            fixedCount++;
          }
        }
      }
    });
    
    // Write updated recipes back to file
    fs.writeFileSync(fullPath, JSON.stringify(uniqueRecipes, null, 2));
    
    console.log(`  ✅ Removed ${recipes.length - uniqueRecipes.length} duplicates`);
    console.log(`  ✅ Fixed ${fixedCount} image paths`);
    console.log(`  📊 Final count: ${uniqueRecipes.length} recipes\n`);
  });
  
  console.log('🎯 All recipe files cleaned up!');
}

cleanupDuplicates(); 