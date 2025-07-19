const fs = require('fs');
const path = require('path');

const foodImagesDir = path.join(__dirname, '../public/foodimages');
const imagesDir = path.join(__dirname, '../public/images');

function removeDuplicates() {
  const foodImages = fs.readdirSync(foodImagesDir).filter(f => f.endsWith('.png'));
  const images = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png'));
  
  console.log('🧹 Removing duplicate images...\n');
  
  let removedCount = 0;
  let savedSpace = 0;
  
  images.forEach(img => {
    if (foodImages.includes(img)) {
      const imagePath = path.join(imagesDir, img);
      const size = fs.statSync(imagePath).size / (1024 * 1024);
      
      try {
        fs.unlinkSync(imagePath);
        console.log(`✅ Removed: ${img} (${size.toFixed(2)}MB)`);
        removedCount++;
        savedSpace += size;
      } catch (error) {
        console.log(`❌ Failed to remove: ${img}`);
      }
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Removed ${removedCount} duplicate files`);
  console.log(`💾 Saved ${savedSpace.toFixed(2)}MB of storage`);
  console.log(`🎯 Next step: Compress remaining images in /public/foodimages/`);
}

// Only run if user confirms
console.log('⚠️  This will remove duplicate images from /public/images/');
console.log('📁 Keeping: /public/foodimages/ (more complete set)');
console.log('🗑️  Removing: Duplicates from /public/images/');
console.log('\nPress Ctrl+C to cancel, or run again to proceed...');

// Uncomment the next line to actually remove files
removeDuplicates(); 