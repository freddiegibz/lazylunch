const fs = require('fs');
const path = require('path');

const recipeFiles = [
  '../src/lib/breakfast.json',
  '../src/lib/lunch.json', 
  '../src/lib/dinner.json'
];

function fixAllDuplicates() {
  console.log('🔧 Comprehensive fix for all duplicates and images...\n');
  
  // Get list of actual image files
  const webpDir = path.join(__dirname, '../public/foodimageswebp');
  const imageFiles = fs.readdirSync(webpDir)
    .filter(file => file.endsWith('.webp') || file.endsWith('.png'))
    .map(file => file);
  
  console.log(`📁 Found ${imageFiles.length} image files\n`);
  
  // First pass: collect all IDs and names to identify conflicts
  const allRecipes = [];
  const seenIds = new Set();
  const seenNames = new Set();
  
  recipeFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const recipes = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const mealType = path.basename(filePath, '.json');
    
    recipes.forEach(recipe => {
      allRecipes.push({
        ...recipe,
        mealType,
        filePath,
        originalId: recipe.id
      });
    });
  });
  
  console.log(`📊 Found ${allRecipes.length} total recipes\n`);
  
  // Second pass: fix IDs and images
  const updatedFiles = {};
  
  allRecipes.forEach(recipe => {
    const { mealType, originalId, name } = recipe;
    
    // Fix ID conflicts
    if (seenIds.has(originalId)) {
      recipe.id = `${mealType}-${originalId}`;
      console.log(`  🔄 Fixed ID: "${name}" ${originalId} → ${recipe.id}`);
    } else {
      seenIds.add(originalId);
    }
    
    // Fix name conflicts (keep the first occurrence)
    if (seenNames.has(name)) {
      recipe.name = `${recipe.name} (${mealType})`;
      console.log(`  🔄 Fixed name: "${originalId}" → "${recipe.name}"`);
    } else {
      seenNames.add(name);
    }
    
    // Fix missing images
    if (!recipe.image || recipe.image === null) {
      const recipeName = recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Try to find a matching image
      let bestMatch = imageFiles.find(file => 
        file.toLowerCase().replace(/[^a-z0-9]/g, '').includes(recipeName) ||
        recipeName.includes(file.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );
      
      // If no match, try common mappings
      if (!bestMatch) {
        const commonMappings = {
          'avocado': 'avocadoontoast.webp',
          'toast': 'avocadoontoast.webp',
          'salmon': 'smokedsalmoncreamcheesebagel.webp',
          'bagel': 'smokedsalmoncreamcheesebagel.webp',
          'pasta': 'pestopastacherrytomatos.webp',
          'pesto': 'pestopastacherrytomatos.webp',
          'chicken': 'chickenceasarwrap.webp',
          'wrap': 'chickenceasarwrap.webp',
          'turkey': 'turkeyhummuswrap.webp',
          'hummus': 'turkeyhummuswrap.webp',
          'egg': 'eggfriedrice.webp',
          'rice': 'eggfriedrice.webp',
          'beef': 'beefmeatballstomatosauce.webp',
          'meatball': 'beefmeatballstomatosauce.webp',
          'curry': 'vegchickpeacurry.webp',
          'chickpea': 'vegchickpeacurry.webp',
          'soup': 'lentilsoup.webp',
          'lentil': 'lentilsoup.webp',
          'fish': 'fishandchipsovenbaked.webp',
          'chips': 'fishandchipsovenbaked.webp',
          'sausage': 'sausageandmash.webp',
          'mash': 'sausageandmash.webp',
          'pork': 'pulledporksandwich.webp',
          'pulled': 'pulledporksandwich.webp',
          'bbq': 'bbqchickendrumsticks&corn.webp',
          'drumstick': 'bbqchickendrumsticks&corn.webp',
          'gyro': 'greekchickengyros.webp',
          'greek': 'greekchickengyros.webp',
          'quesadilla': 'veggiequesadillas.webp',
          'veggie': 'veggiequesadillas.webp',
          'bake': 'tunapastabake.webp',
          'tuna': 'tunapastabake.webp',
          'omelette': 'hamandcheeseomellete.webp',
          'ham': 'hamandcheeseomellete.webp',
          'stew': 'beefandvegetablestew.webp',
          'vegetable': 'beefandvegetablestew.webp',
          'taco': 'ovenbakedbeantacos.webp',
          'bean': 'ovenbakedbeantacos.webp',
          'sheet': 'sheetpansausageandveg.webp',
          'pan': 'sheetpansausageandveg.webp'
        };
        
        for (const [key, value] of Object.entries(commonMappings)) {
          if (recipeName.includes(key) && imageFiles.includes(value)) {
            bestMatch = value;
            break;
          }
        }
      }
      
      if (bestMatch) {
        recipe.image = `/foodimageswebp/${bestMatch}`;
        console.log(`  ✅ Fixed image for "${recipe.name}": ${bestMatch}`);
      } else {
        console.log(`  ⚠️  No image found for "${recipe.name}"`);
      }
    }
    
    // Group by file path
    if (!updatedFiles[recipe.filePath]) {
      updatedFiles[recipe.filePath] = [];
    }
    updatedFiles[recipe.filePath].push(recipe);
  });
  
  // Write updated files
  Object.entries(updatedFiles).forEach(([filePath, recipes]) => {
    const fullPath = path.join(__dirname, filePath);
    const cleanRecipes = recipes.map(({ mealType, filePath, originalId, ...recipe }) => recipe);
    fs.writeFileSync(fullPath, JSON.stringify(cleanRecipes, null, 2));
    console.log(`  📄 Updated ${path.basename(filePath)}: ${cleanRecipes.length} recipes`);
  });
  
  console.log('\n🎯 All duplicates and images fixed!');
}

fixAllDuplicates(); 