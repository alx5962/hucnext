/**
 * BRAM verification: 
 * 1. Launch game, navigate past title screen
 * 2. Read BRAM memory area to verify save_game() wrote data
 * 3. Also list the WRAM area to find save buffer
 */
const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');
const outPng = 'C:/Users/alx59/.gemini/antigravity-ide/brain/daf8e627-20e4-4b05-b7c4-a324891bb86a/geargfx_preview.png';

async function stepFrames(mcp, n) {
  for (let i = 0; i < n; i++) await mcp.callTool('debug_step_frame', {});
}

async function screenshot(mcp, label) {
  const res = await mcp.callTool('get_screenshot', {});
  if (res.content && res.content[0]) {
    fs.writeFileSync(outPng, Buffer.from(res.content[0].data, 'base64'));
    console.log(`Screenshot [${label}] saved.`);
  }
}

(async () => {
  console.log('=== BRAM Write Verification ===');

  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Run 120 frames to get to title screen
  console.log('Running 120 frames...');
  await stepFrames(mcp, 120);
  await screenshot(mcp, 'initial');

  // Advance past await_input
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);

  // Select "New Game" (option 0 is default)
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 120);
  await screenshot(mcp, 'after_new_game');

  // List memory areas to find BRAM
  console.log('\nListing memory areas...');
  const areas = await mcp.callTool('list_memory_areas', {});
  console.log('Memory areas:', JSON.stringify(areas.content.map(c => c.text).join('\n').substring(0, 800)));

  // Try to read BRAM area (it should be at $8000 when mapped to MPR4 bank $F7)
  // In Geargrafx, BRAM shows up as "Card RAM" area
  console.log('\nReading BRAM via Card RAM area (first 64 bytes)...');
  try {
    const bramRead = await mcp.callTool('read_memory', { area: 'Card RAM', offset: 0, length: 64 });
    console.log('BRAM raw:', JSON.stringify(bramRead.content.map(c => c.text).join('')));
  } catch(e) {
    console.log('Card RAM read failed:', e.message || e);
  }

  // Try WRAM 
  console.log('\nReading WRAM (first 256 bytes)...');
  try {
    const wramRead = await mcp.callTool('read_memory', { area: 'WRAM', offset: 0, length: 64 });
    console.log('WRAM[0..63]:', JSON.stringify(wramRead.content.map(c => c.text).join('')));
  } catch(e) {
    console.log('WRAM read failed:', e.message || e);
  }

  mcp.stop();
  console.log('\n=== Done ===');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
