const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 256, 384, 512];
const inputLogo = path.join(__dirname, '../public/placeholder-logo.png');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    // Logo dosyasının varlığını kontrol et
    if (!fs.existsSync(inputLogo)) {
      console.error('Logo dosyası bulunamadı:', inputLogo);
      process.exit(1);
    }

    // Her boyut için icon oluştur
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(inputLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ ${size}x${size} icon oluşturuldu: ${outputPath}`);
    }

    // Apple touch icon (180x180)
    const appleIconPath = path.join(outputDir, 'apple-touch-icon.png');
    await sharp(inputLogo)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(appleIconPath);
    
    console.log(`✓ Apple touch icon oluşturuldu: ${appleIconPath}`);

    // Favicon (32x32)
    const faviconPath = path.join(outputDir, 'favicon.ico');
    await sharp(inputLogo)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(faviconPath.replace('.ico', '.png'));
    
    console.log(`✓ Favicon oluşturuldu: ${faviconPath.replace('.ico', '.png')}`);
    console.log('\n✅ Tüm icon\'lar başarıyla oluşturuldu!');
  } catch (error) {
    console.error('Icon oluşturma hatası:', error);
    process.exit(1);
  }
}

generateIcons();

