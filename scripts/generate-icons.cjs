#!/usr/bin/env node
/**
 * Generate AI Blocker icons at all required sizes.
 * Uses sharp to render SVG to PNG.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 96, 128];
const outDir = path.join(__dirname, '..', 'public', 'icon');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// SVG icon: shield with "AI" crossed out
function generateSvg(size) {
  const s = size;
  const pad = s * 0.1;
  const strokeW = Math.max(1, s * 0.06);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#0f1f36"/>
    </linearGradient>
  </defs>
  <!-- Shield shape -->
  <path d="M${s*0.5} ${s*0.08} L${s*0.92} ${s*0.25} L${s*0.92} ${s*0.55} Q${s*0.92} ${s*0.82} ${s*0.5} ${s*0.95} Q${s*0.08} ${s*0.82} ${s*0.08} ${s*0.55} L${s*0.08} ${s*0.25} Z" 
        fill="url(#shieldGrad)" stroke="#2a5a8f" stroke-width="${strokeW}"/>
  <!-- AI text -->
  <text x="${s*0.5}" y="${s*0.62}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${s*0.28}" fill="#7eb8f2">AI</text>
  <!-- Diagonal strike line -->
  <line x1="${s*0.22}" y1="${s*0.78}" x2="${s*0.78}" y2="${s*0.22}" stroke="#e8443a" stroke-width="${s*0.08}" stroke-linecap="round"/>
</svg>`;
}

async function main() {
  for (const size of sizes) {
    const svg = generateSvg(size);
    const outPath = path.join(outDir, `${size}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log(`Generated ${size}x${size} icon → ${outPath}`);
  }
  console.log('Done!');
}

main().catch(console.error);