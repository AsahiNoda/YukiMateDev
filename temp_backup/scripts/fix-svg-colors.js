const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'assets', 'images', 'icons');
const files = fs.readdirSync(iconsDir).filter(file => file.endsWith('.svg'));

files.forEach(file => {
  const filePath = path.join(iconsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace #000000 with currentColor
  content = content.replace(/#000000/g, 'currentColor');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${file}`);
});

console.log(`\nFixed ${files.length} SVG files`);
