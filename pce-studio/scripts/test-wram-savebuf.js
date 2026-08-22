/**
 * Read WRAM save buffer at known address to verify save_game() wrote data.
 * g_save_buffer is at WRAM bank F8, addr 0x3B05
 * WRAM (area id 0) physical offset = 0x3B05 - 0x2000 = 0x1B05
 * SAVE_HEADER_MAGIC = 0x5043 ('PC')
 */
const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');

async function stepFrames(mcp, n) {
  for (let i = 0; i < n; i++) await mcp.callTool('debug_step_frame', {});
}

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Navigate through title screen to Cave scene
  await mcp.callTool('toggle_fast_forward', { enabled: true });
  await stepFrames(mcp, 200);
  await mcp.callTool('toggle_fast_forward', { enabled: false });

  // Press I to pass await_input, then I again to select New Game
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await mcp.callTool('toggle_fast_forward', { enabled: true });
  await stepFrames(mcp, 300); // reach cave/outside
  await mcp.callTool('toggle_fast_forward', { enabled: false });

  // Read WRAM at offset 0x1B05 (g_save_buffer)
  // WRAM area id = 0
  console.log('\nReading g_save_buffer from WRAM (offset 0x1B05, 30 bytes)...');
  try {
    const wram = await mcp.callTool('read_memory', { area: 0, offset: '0x1B05', size: 30 });
    console.log('g_save_buffer raw:', wram.content[0].text);
    // First 2 bytes should be 0x43, 0x50 (little-endian 0x5043 = SAVE_HEADER_MAGIC 'PC')
    // if magic is present, save_game was called
  } catch(e) {
    console.log('WRAM read error:', JSON.stringify(e));
  }

  // Also read first 64 bytes of WRAM to see general state  
  console.log('\nReading WRAM first 64 bytes...');
  try {
    const wram0 = await mcp.callTool('read_memory', { area: 0, offset: '0x0000', size: 64 });
    console.log('WRAM[0..63]:', wram0.content[0].text.substring(0, 200));
  } catch(e) {
    console.log('WRAM[0] read error:', JSON.stringify(e));
  }

  mcp.stop();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
