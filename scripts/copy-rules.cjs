// Copy DNR rules to build output
const fs = require('fs');
const path = require('path');

const browsers = ['chrome-mv3'];

for (const browser of browsers) {
  const outDir = path.join(__dirname, '..', '.output', browser, 'rules');
  const srcDir = path.join(__dirname, '..', 'rules');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
  }
  console.log(`Copied ${files.length} rule files to ${outDir}`);
}