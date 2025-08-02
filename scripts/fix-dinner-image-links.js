const fs = require('fs');
const path = require('path');

const dinnerFile = 'src/lib/dinner.json';
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
  for (const word of normName.split(/\s+/)) {
    best = imageFiles.find(img => normalize(img).includes(word));
    if (best) return best;
  }
  return null;
}

const recipes = JSON.parse(fs.readFileSync(dinnerFile, 'utf8'));
let changed = 0;
recipes.forEach(recipe => {
  if (recipe.image && recipe.image.endsWith('.png')) {
    const best = findBestImage(recipe.name);
    if (best) {
      recipe.image = `/foodimageswebp/${best}`;
      changed++;
    }
  }
});

fs.writeFileSync(dinnerFile, JSON.stringify(recipes, null, 2));
console.log(`Updated ${changed} image links in ${dinnerFile}`); 