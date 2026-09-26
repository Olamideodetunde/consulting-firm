const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

let missing = 0;
let totalImages = 0;

htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(publicDir, file), 'utf8');
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const src = match[1];
    if (src.startsWith('http://') || src.startsWith('https://')) continue;
    totalImages++;
    const resolvedPath = path.join(publicDir, src.split('?')[0]);
    if (!fs.existsSync(resolvedPath)) {
      console.error('MISSING in ' + file + ': ' + src + ' -> ' + resolvedPath);
      missing++;
    }
  }

  const bgRegex = /url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgRegex.exec(content)) !== null) {
    const url = match[1];
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) continue;
    const resolvedPath = path.join(publicDir, url.split('?')[0]);
    if (!fs.existsSync(resolvedPath)) {
      console.error('MISSING BG in ' + file + ': ' + url + ' -> ' + resolvedPath);
      missing++;
    }
  }
});

// Also check css/custom.css
const cssContent = fs.readFileSync(path.join(publicDir, 'css', 'custom.css'), 'utf8');
const cssBgRegex = /url\(["']?([^"')]+)["']?\)/gi;
let match;
while ((match = cssBgRegex.exec(cssContent)) !== null) {
  const url = match[1];
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) continue;
  const resolvedPath = path.join(publicDir, 'css', url.split('?')[0]);
  if (!fs.existsSync(resolvedPath)) {
    console.error('MISSING in custom.css: ' + url + ' -> ' + resolvedPath);
    missing++;
  } else {
    totalImages++;
  }
}

console.log(`Checked ${totalImages} asset references across ${htmlFiles.length} HTML files + custom.css. Missing: ${missing}`);
if (missing === 0) {
  console.log('SUCCESS: All asset references resolved 100% correctly!');
}
