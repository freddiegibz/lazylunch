const fs = require('fs');
const path = require('path');

const recipeFiles = [
  'src/lib/breakfast.json',
  'src/lib/lunch.json',
  'src/lib/dinner.json',
];
const imageDir = 'public/foodimageswebp';
const imageFiles = fs.readdirSync(imageDir)
  .filter(f => f.endsWith('.webp'));

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findBestImage(recipeName) {
  const normName = normalize(recipeName);
  // Try exact match
  let best = imageFiles.find(img => normalize(img).includes(normName));
  if (best) return best;
  // Try partial match
  best = imageFiles.find(img => normName.includes(normalize(img)));
  if (best) return best;
  // Try by words
  for (const word of normName.split(/(?=[A-Z])/)) {
    if (word.length > 3) {
      best = imageFiles.find(img => normalize(img).includes(word));
      if (best) return best;
    }
  }
  // Try by first word
  const firstWord = normName.split(/\s+/)[0];
  best = imageFiles.find(img => normalize(img).includes(firstWord));
  if (best) return best;
  return null;
}

for (const file of recipeFiles) {
  const recipes = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = 0;
  for (const recipe of recipes) {
    const bestImage = findBestImage(recipe.name);
    if (bestImage && recipe.image !== `/foodimageswebp/${bestImage}`) {
      recipe.image = `/foodimageswebp/${bestImage}`;
      changed++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(recipes, null, 2));
  console.log(`${file}: Updated ${changed} image links`);
} 