const fs = require('fs');
const path = require('path');

const recipeFiles = [
  '../src/lib/breakfast.json',
  '../src/lib/lunch.json', 
  '../src/lib/dinner.json'
];

function checkImageReferences() {
  console.log('🔍 Checking image references...\n');
  
  // Get list of actual WebP files
  const webpFiles = fs.readdirSync(path.join(__dirname, '../public/foodimageswebp'))
    .filter(file => file.endsWith('.webp'))
    .map(file => file);
  
  console.log('📁 Actual WebP files:', webpFiles.length);
  console.log('Files:', webpFiles.join(', '));
  console.log('\n');
  
  recipeFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const recipes = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    console.log(`📄 Checking ${path.basename(filePath)}:`);
    
    recipes.forEach(recipe => {
      if (recipe.image) {
        const imageName = recipe.image.split('/').pop(); // Get filename from path
        const exists = webpFiles.includes(imageName);
        
        if (exists) {
          console.log(`  ✅ ${recipe.name}: ${imageName}`);
        } else {
          console.log(`  ❌ ${recipe.name}: ${imageName} (MISSING)`);
        }
      } else {
        console.log(`  ⚠️  ${recipe.name}: No image specified`);
      }
    });
    
    console.log('');
  });
}

checkImageReferences(); 