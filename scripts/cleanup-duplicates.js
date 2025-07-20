const fs = require('fs');
const path = require('path');

const foodImagesDir = path.join(__dirname, '../public/foodimages');
const imagesDir = path.join(__dirname, '../public/images');

function getFileSizeInMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
}

function analyzeDuplicates() {
  const foodImages = fs.readdirSync(foodImagesDir).filter(f => f.endsWith('.png'));
  const images = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png'));
  
  console.log('📊 Image Analysis:\n');
  console.log(`📁 /public/foodimages/: ${foodImages.length} images`);
  console.log(`📁 /public/images/: ${images.length} images`);
  
  const duplicates = [];
  const uniqueInImages = [];
  
  images.forEach(img => {
    if (foodImages.includes(img)) {
      const foodSize = getFileSizeInMB(path.join(foodImagesDir, img));
      const imageSize = getFileSizeInMB(path.join(imagesDir, img));
      duplicates.push({ name: img, foodSize, imageSize });
    } else {
      uniqueInImages.push(img);
    }
  });
  
  console.log(`\n🔄 Duplicates found: ${duplicates.length}`);
  console.log(`📄 Unique in /images/: ${uniqueInImages.length}`);
  
  if (duplicates.length > 0) {
    console.log('\n📋 Duplicate files:');
    duplicates.forEach(({ name, foodSize, imageSize }) => {
      console.log(`  🔄 ${name}: foodimages(${foodSize}MB) / images(${imageSize}MB)`);
    });
  }
  
  if (uniqueInImages.length > 0) {
    console.log('\n📄 Files only in /images/:');
    uniqueInImages.forEach(img => {
      const size = getFileSizeInMB(path.join(imagesDir, img));
      console.log(`  📄 ${img}: ${size}MB`);
    });
  }
  
  const totalSize = duplicates.reduce((sum, { foodSize, imageSize }) => {
    return sum + parseFloat(foodSize) + parseFloat(imageSize);
  }, 0);
  
  console.log(`\n💾 Total duplicate storage: ${totalSize.toFixed(2)}MB`);
  console.log(`🎯 Potential savings: ${(totalSize / 2).toFixed(2)}MB`);
  
  console.log('\n💡 Recommendation:');
  console.log('1. Keep only /public/foodimages/ (more complete set)');
  console.log('2. Delete duplicate files from /public/images/');
  console.log('3. Update code to reference /foodimages/ consistently');
  console.log('4. Compress remaining images');
}

analyzeDuplicates(); 