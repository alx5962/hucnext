const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');
const outPng = 'C:/Users/alx59/.gemini/antigravity-ide/brain/daf8e627-20e4-4b05-b7c4-a324891bb86a/geargfx_preview.png';

async function stepFrames(mcp, n) {
  for (let i = 0; i < n; i++) {
    await mcp.callTool('debug_step_frame', {});
  }
}

(async () => {
  console.log('Testing pckid scene with player moving left...');
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Run 100 frames to walk right through triggers into scene 2, 3, 7 or directly test
  // In Scene 1: walk right to warp to Scene 2
  await mcp.callTool('controller_button', { player: 1, button: 'right', action: 'press' });
  await stepFrames(mcp, 180); // triggers scene 2 warp
  await stepFrames(mcp, 150); // triggers scene 3 warp
  await stepFrames(mcp, 150); // triggers scene 7 warp (pckid)
  await mcp.callTool('controller_button', { player: 1, button: 'right', action: 'release' });
  await stepFrames(mcp, 30);

  // Now in Scene 7 (pckid)! Walk LEFT to test mirroring:
  console.log('In scene 7 (pckid): pressing LEFT...');
  await mcp.callTool('controller_button', { player: 1, button: 'left', action: 'press' });
  await stepFrames(mcp, 45);
  await mcp.callTool('controller_button', { player: 1, button: 'left', action: 'release' });
  await stepFrames(mcp, 5);

  const res = await mcp.callTool('get_screenshot', {});
  if (res.content && res.content[0]) {
    fs.writeFileSync(outPng, Buffer.from(res.content[0].data, 'base64'));
    console.log('Saved verification screenshot to:', outPng);
  }

  mcp.stop();
  console.log('Test completed successfully!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
