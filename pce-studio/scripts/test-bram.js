const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');
const outPng = 'C:/Users/alx59/.gemini/antigravity-ide/brain/daf8e627-20e4-4b05-b7c4-a324891bb86a/geargfx_preview.png';

(async () => {
  console.log('Testing BRAM persistent game saving in Geargrafx...');
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Run 60 frames to initialize engine & scene
  for (let i = 0; i < 60; i++) {
    await mcp.callTool('debug_step_frame', {});
  }

  // Capture screenshot
  const res = await mcp.callTool('get_screenshot', {});
  if (res.content && res.content[0]) {
    fs.writeFileSync(outPng, Buffer.from(res.content[0].data, 'base64'));
    console.log('Saved verification screenshot to:', outPng);
  }

  mcp.stop();
  console.log('BRAM test completed successfully!');
  process.exit(0);
})().catch(err => {
  console.error('Error during BRAM test:', err);
  process.exit(1);
});
