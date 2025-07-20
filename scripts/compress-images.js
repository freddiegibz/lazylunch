const fs = require('fs');
const path = require('path');

// Simple script to list large images
const foodImagesDir = path.join(__dirname, '../public/foodimages');
const imagesDir = path.join(__dirname, '../public/images');

function getFileSizeInMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
}

function checkLargeImages(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  const largeFiles = [];
  
  files.forEach(file => {
    if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      const filePath = path.join(dir, file);
      const sizeMB = getFileSizeInMB(filePath);
      
      if (parseFloat(sizeMB) > 0.5) { // Files larger than 500KB
        largeFiles.push({ file, size: sizeMB });
      }
    }
  });
  
  return largeFiles;
}

console.log('🔍 Checking for large images...\n');

const foodImages = checkLargeImages(foodImagesDir);
const images = checkLargeImages(imagesDir);

if (foodImages && foodImages.length > 0) {
  console.log('📁 Large images in /public/foodimages/:');
  foodImages.forEach(({ file, size }) => {
    console.log(`  ❌ ${file}: ${size}MB`);
  });
}

if (images && images.length > 0) {
  console.log('\n📁 Large images in /public/images/:');
  images.forEach(({ file, size }) => {
    console.log(`  ❌ ${file}: ${size}MB`);
  });
}

if ((!foodImages || foodImages.length === 0) && (!images || images.length === 0)) {
  console.log('✅ No large images found!');
} else {
  console.log('\n💡 Recommendation:');
  console.log('1. Go to https://tinypng.com/');
  console.log('2. Upload the large images listed above');
  console.log('3. Download the compressed versions');
  console.log('4. Replace the original files');
  console.log('\n🎯 Target: Get all images under 300KB');
} 