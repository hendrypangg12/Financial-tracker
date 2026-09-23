// Mechanical exports of the approved wallet icon; no generated/redrawn artwork.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const mobile = path.resolve(__dirname, '..');
const icon = path.join(mobile, '../assets/icons/beruang-wallet-1024.png');
const res = path.join(mobile, 'android/app/src/main/res');
(async () => {
  for (const [density, size] of Object.entries({ mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 })) {
    const dir = path.join(res, 'mipmap-' + density);
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) await sharp(icon).resize(size, size).png().toFile(path.join(dir, name));
    const adaptive = Math.round(size * 108 / 48);
    const artwork = Math.round(adaptive * 0.63);
    const inset = Math.floor((adaptive - artwork) / 2);
    const resized = await sharp(icon).resize(artwork, artwork).png().toBuffer();
    await sharp({ create: { width:adaptive, height:adaptive, channels:4, background:'#fbf6ee' } }).composite([{ input:resized, left:inset, top:inset }]).png().toFile(path.join(dir,'ic_launcher_foreground.png'));
  }
  await fs.writeFile(path.join(res,'values/ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#fbf6ee</color></resources>\n');
  async function visit(dir) {
    for (const file of await fs.readdir(dir,{withFileTypes:true})) {
      const full = path.join(dir,file.name);
      if (file.isDirectory()) await visit(full);
      else if (file.name === 'splash.png') {
        const {width,height} = await sharp(full).metadata();
        const size=Math.round(Math.min(width,height) * .25);
        const brand=await sharp(icon).resize(size,size).png().toBuffer();
        await sharp({create:{width,height,channels:4,background:'#fbf6ee'}}).composite([{input:brand,gravity:'center'}]).png().toFile(full + '.new');
        await fs.rename(full + '.new',full);
      }
    }
  }
  await visit(res);
  const iosIcon=path.join(mobile,'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  await fs.copyFile(icon,iosIcon);
  console.log('Approved wallet icon exported to Android launcher/splash and iOS icon.');
})();
