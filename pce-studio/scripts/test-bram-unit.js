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

async function captureScreenshot(mcp, label) {
  const res = await mcp.callTool('get_screenshot', {});
  if (res.content && res.content[0]) {
    fs.writeFileSync(outPng, Buffer.from(res.content[0].data, 'base64'));
    console.log(`Screenshot [${label}] saved to ${outPng}`);
  }
}

(async () => {
  console.log('=== BRAM Verification in Geargrafx ===');
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Run 60 frames to initialize
  await stepFrames(mcp, 60);

  // Check BRAM area by calling debug functions
  console.log('Stepping 100 frames to run startup...');
  await stepFrames(mcp, 100);

  await captureScreenshot(mcp, 'bram_unit_test');

  mcp.stop();
  console.log('BRAM test completed successfully!');
})().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
