const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');
const outPng = 'C:/Users/alx59/.gemini/antigravity-ide/brain/daf8e627-20e4-4b05-b7c4-a324891bb86a/geargfx_preview.png';

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Run 150 frames to be on title screen
  for (let i = 0; i < 150; i++) {
    await mcp.callTool('debug_step_frame', {});
  }

  const res = await mcp.callTool('get_screenshot', {});
  if (res.content && res.content[0]) {
    fs.writeFileSync(outPng, Buffer.from(res.content[0].data, 'base64'));
    console.log('Saved title screen screenshot without player!');
  }

  mcp.stop();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
