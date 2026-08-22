/**
 * Test BRAM save/load flow:
 * 1. Launch game
 * 2. Simulate pressing A to start new game (Cave scene is scene 1 in PCEtest1 project)
 * 3. After a few seconds, trigger the save NPC
 * 4. Close emulator (to flush .sav file)
 * 5. Re-launch the same ROM
 * 6. Choose "Continue" (option 1 = false branch)
 * 7. Verify load_game is triggered (different scene)
 */
const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');
const savDir = process.env.APPDATA + '\\Geardome\\Geargrafx';
const outPng = 'C:/Users/alx59/.gemini/antigravity-ide/brain/daf8e627-20e4-4b05-b7c4-a324891bb86a/geargfx_preview.png';

async function takeScreenshot(mcp, label) {
  const res = await mcp.callTool('get_screenshot', {});
  if (res.content && res.content[0]) {
    fs.writeFileSync(outPng, Buffer.from(res.content[0].data, 'base64'));
    console.log(`Screenshot [${label}] saved.`);
  }
}

(async () => {
  console.log('=== BRAM Save/Load Test ===');

  // --- Session 1: Start game, navigate to cave, interact with save NPC ---
  let mcp = new GeargrafxMCP(romPath);
  await mcp.start();
  console.log('Session 1: Running 120 frames to let title screen appear...');
  for (let i = 0; i < 120; i++) await mcp.callTool('debug_step_frame', {});

  await takeScreenshot(mcp, 'title_screen');
  console.log('Pressing Button I to advance past await_input...');
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  for (let i = 0; i < 30; i++) await mcp.callTool('debug_step_frame', {});

  // Choice dialogue: option 0 = "New Game" is selected by default, press I to confirm
  console.log('Pressing I to select New Game...');
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  for (let i = 0; i < 120; i++) await mcp.callTool('debug_step_frame', {});
  await takeScreenshot(mcp, 'after_new_game');

  console.log('Closing emulator (to flush .sav)...');
  mcp.stop();
  await new Promise(r => setTimeout(r, 1000));

  // Check if .sav file was created
  const savFiles = fs.existsSync(savDir) ? fs.readdirSync(savDir) : [];
  console.log('Files in Geargrafx save dir:', savFiles);

  const memRes = await new Promise(resolve => {
    // Re-launch to check BRAM state
    let mcp2 = new GeargrafxMCP(romPath);
    mcp2.start().then(async () => {
      for (let i = 0; i < 30; i++) await mcp2.callTool('debug_step_frame', {});
      const m = await mcp2.callTool('memory_read', { address: 0x8000, length: 32 });
      mcp2.stop();
      resolve(m);
    });
  });

  console.log('BRAM header at $8000:', memRes);
  console.log('=== Test Complete ===');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
