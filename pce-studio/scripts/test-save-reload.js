const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');
const outPng = 'C:/Users/alx59/.gemini/antigravity-ide/brain/daf8e627-20e4-4b05-b7c4-a324891bb86a/geargfx_preview.png';

(async () => {
  console.log('--- Step 1: Launch and save in Cave ---');
  let mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Run initial frames
  for (let i = 0; i < 60; i++) await mcp.callTool('debug_step_frame', {});

  // On Title Screen: Choice "New Game" (option 0)
  // Press A (Button I) to select New Game
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  for (let i = 0; i < 60; i++) await mcp.callTool('debug_step_frame', {});

  mcp.stop();
  console.log('Step 1 finished.');
})().catch(err => { console.error(err); process.exit(1); });
