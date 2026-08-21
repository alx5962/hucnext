const fs = require('fs');
const path = require('path');

const fontIncPath = path.resolve('..', 'include', 'huc', 'font.inc');
const content = fs.readFileSync(fontIncPath, 'utf8');

const bytes = [];
const lines = content.split(/\r?\n/);
for (const line of lines) {
  const match = line.match(/\.db\s+([0-9a-fA-F$,\s]+)/);
  if (match) {
    const rawTokens = match[1].split(',');
    for (const tok of rawTokens) {
      const clean = tok.trim().replace('$', '0x');
      if (clean) {
        bytes.push(parseInt(clean, 16));
      }
    }
  }
}

console.log('Parsed font bytes count:', bytes.length);

const words = [];
const numChars = Math.min(96, Math.floor(bytes.length / 8));
for (let c = 0; c < numChars; c++) {
  for (let r = 0; r < 8; r++) {
    const b = bytes[c * 8 + r] || 0;
    const low = 0xFF; // Plane 0 = 1 for all pixels
    const high = ((~b) & 0xFF); // Plane 1 = 1 for background, 0 for letters
    const w = ((high << 8) | low);
    words.push('0x' + w.toString(16).toUpperCase().padStart(4, '0'));
  }
  for (let r = 0; r < 8; r++) {
    words.push('0x0000'); // Planes 2 & 3
  }
}

const linesList = [];
for (let i = 0; i < words.length; i += 8) {
  linesList.push('  ' + words.slice(i, i + 8).join(', '));
}

let cContent = '/* Auto-generated black-on-white dialogue font for HuC PC Engine */\nconst unsigned int dialogue_font_chr[' + words.length + '] = {\n' + linesList.join(',\n') + '\n};\n';

const outPath = path.resolve('appData', 'engine', 'pcevm', 'src', 'dialogue_font.h');
fs.writeFileSync(outPath, cContent, 'utf8');
console.log('Wrote dialogue font without trailing comma to:', outPath, 'words:', words.length);
