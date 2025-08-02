const fs = require('fs');
const path = require('path');

const recipeFiles = [
  '../src/lib/breakfast.json',
  '../src/lib/lunch.json', 
  '../src/lib/dinner.json'
];

function comprehensiveCleanup() {
  console.log('🧹 Comprehensive cleanup of recipe files...\n');
  
  // Get list of actual WebP files
  const webpDir = path.join(__dirname, '../public/foodimageswebp');
  const webpFiles = fs.readdirSync(webpDir)
    .filter(file => file.endsWith('.webp') || file.endsWith('.png'))
    .map(file => file);
  
  console.log(`📁 Found ${webpFiles.length} image files in foodimageswebp directory\n`);
  
  recipeFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const recipes = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    console.log(`📄 Processing ${path.basename(filePath)}...`);
    console.log(`  📊 Original count: ${recipes.length}`);
    
    // Remove duplicates based on both name and ID
    const uniqueRecipes = [];
    const seenNames = new Set();
    const seenIds = new Set();
    let removedDuplicates = 0;
    
    recipes.forEach(recipe => {
      if (!seenNames.has(recipe.name) && !seenIds.has(recipe.id)) {
        seenNames.add(recipe.name);
        seenIds.add(recipe.id);
        uniqueRecipes.push(recipe);
      } else {
        console.log(`  ❌ Removed duplicate: ${recipe.name} (ID: ${recipe.id})`);
        removedDuplicates++;
      }
    });
    
    // Fix image paths
    let fixedImages = 0;
    let missingImages = 0;
    
    uniqueRecipes.forEach(recipe => {
      if (recipe.image) {
        const originalImage = recipe.image;
        
        // Fix paths that use /foodimages/ instead of /foodimageswebp/
        if (recipe.image.includes('/foodimages/')) {
          recipe.image = recipe.image.replace('/foodimages/', '/foodimageswebp/');
        }
        
        // Get the filename from the path
        const imageFilename = recipe.image.split('/').pop();
        
        // Check if the image file exists
        if (webpFiles.includes(imageFilename)) {
          // Image exists, make sure it's using the correct path
          if (recipe.image !== originalImage) {
            fixedImages++;
          }
        } else {
          // Image doesn't exist, try to find a similar one
          const recipeName = recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const possibleMatches = webpFiles.filter(file => 
            file.toLowerCase().includes(recipeName) ||
            recipeName.includes(file.toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
          
          if (possibleMatches.length > 0) {
            recipe.image = `/foodimageswebp/${possibleMatches[0]}`;
            console.log(`  🔄 Fixed image for "${recipe.name}": ${originalImage} → ${recipe.image}`);
            fixedImages++;
          } else {
            console.log(`  ⚠️  No image found for "${recipe.name}" (${originalImage})`);
            missingImages++;
            // Remove the image path if no match found
            recipe.image = null;
          }
        }
      }
    });
    
    // Write updated recipes back to file
    fs.writeFileSync(fullPath, JSON.stringify(uniqueRecipes, null, 2));
    
    console.log(`  ✅ Removed ${removedDuplicates} duplicates`);
    console.log(`  ✅ Fixed ${fixedImages} image paths`);
    console.log(`  ⚠️  ${missingImages} missing images`);
    console.log(`  📊 Final count: ${uniqueRecipes.length} recipes\n`);
  });
  
  console.log('🎯 Comprehensive cleanup completed!');
  console.log('\n💡 Next steps:');
  console.log('1. Check the console output for any missing images');
  console.log('2. Add missing images to the foodimageswebp directory');
  console.log('3. Test the application to ensure all images load correctly');
}

comprehensiveCleanup(); 