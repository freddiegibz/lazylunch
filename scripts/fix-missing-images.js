const fs = require('fs');
const path = require('path');

const recipeFiles = [
  '../src/lib/breakfast.json',
  '../src/lib/lunch.json', 
  '../src/lib/dinner.json'
];

function fixMissingImages() {
  console.log('🖼️  Fixing missing images...\n');
  
  // Get list of actual image files
  const webpDir = path.join(__dirname, '../public/foodimageswebp');
  const imageFiles = fs.readdirSync(webpDir)
    .filter(file => file.endsWith('.webp') || file.endsWith('.png'))
    .map(file => file);
  
  console.log(`📁 Found ${imageFiles.length} image files\n`);
  
  recipeFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const recipes = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    console.log(`📄 Processing ${path.basename(filePath)}...`);
    
    let fixedCount = 0;
    
    recipes.forEach(recipe => {
      if (!recipe.image || recipe.image === null) {
        // Try to find a matching image based on recipe name
        const recipeName = recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Look for exact matches first
        let bestMatch = imageFiles.find(file => 
          file.toLowerCase().replace(/[^a-z0-9]/g, '').includes(recipeName) ||
          recipeName.includes(file.toLowerCase().replace(/[^a-z0-9]/g, ''))
        );
        
        // If no exact match, look for partial matches
        if (!bestMatch) {
          const words = recipeName.split(/(?=[A-Z])/).map(word => word.toLowerCase());
          for (const word of words) {
            if (word.length > 3) { // Only consider words longer than 3 characters
              const match = imageFiles.find(file => 
                file.toLowerCase().includes(word)
              );
              if (match) {
                bestMatch = match;
                break;
              }
            }
          }
        }
        
        // If still no match, try some common mappings
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
          console.log(`  ✅ Fixed "${recipe.name}": ${bestMatch}`);
          fixedCount++;
        } else {
          console.log(`  ⚠️  No image found for "${recipe.name}"`);
        }
      }
    });
    
    // Write updated recipes back to file
    fs.writeFileSync(fullPath, JSON.stringify(recipes, null, 2));
    
    console.log(`  📊 Fixed ${fixedCount} missing images\n`);
  });
  
  console.log('🎯 Image fixing completed!');
}

fixMissingImages(); 