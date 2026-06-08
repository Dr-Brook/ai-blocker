// Copy DNR rules and filter lists to build output
const fs = require('fs');
const path = require('path');

const browsers = ['chrome-mv3', 'firefox-mv2'];

for (const browser of browsers) {
  // Copy DNR rules
  const rulesOutDir = path.join(__dirname, '..', '.output', browser, 'rules');
  const rulesSrcDir = path.join(__dirname, '..', 'rules');

  if (!fs.existsSync(rulesOutDir)) {
    fs.mkdirSync(rulesOutDir, { recursive: true });
  }

  const ruleFiles = fs.readdirSync(rulesSrcDir).filter(f => f.endsWith('.json'));
  for (const file of ruleFiles) {
    fs.copyFileSync(path.join(rulesSrcDir, file), path.join(rulesOutDir, file));
  }
  console.log(`Copied ${ruleFiles.length} rule files to ${rulesOutDir}`);

  // Copy filter lists (for content script dynamic loading)
  const filterOutDir = path.join(__dirname, '..', '.output', browser, 'filter-lists');
  const filterSrcDir = path.join(__dirname, '..', 'filter-lists');

  if (!fs.existsSync(filterOutDir)) {
    fs.mkdirSync(filterOutDir, { recursive: true });
  }

  const filterFiles = fs.readdirSync(filterSrcDir).filter(f => f.endsWith('.txt'));
  for (const file of filterFiles) {
    fs.copyFileSync(path.join(filterSrcDir, file), path.join(filterOutDir, file));
  }
  console.log(`Copied ${filterFiles.length} filter list files to ${filterOutDir}`);
}