const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve(__dirname, '../build_tmp/main.pce');
const brainDir = 'C:/Users/alx59/.gemini/antigravity-ide/brain/20db9cd8-10fe-44e0-b283-33686cd57ac9';

async function saveScreenshot(mcp, filename) {
  const res = await mcp.callTool('get_screenshot', {});
  const base64Data = res.content && res.content[0] ? res.content[0].data : null;
  if (base64Data) {
    const outPath = path.join(brainDir, filename);
    fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
    console.log(`Saved screenshot: ${outPath}`);
  }
}

(async () => {
  console.log('=== Capturing Visual Screen Fade In Progression ===');
  const mcp = new GeargrafxMCP(romPath);
  try {
    await mcp.start();

    // Frame 18 (Step 7: Pure Black)
    for (let f = 1; f <= 18; f++) await mcp.callTool('debug_step_frame', {});
    await saveScreenshot(mcp, 'fade_step1_black.png');

    // Frame 23 (Step 6: Very Dim)
    for (let f = 19; f <= 23; f++) await mcp.callTool('debug_step_frame', {});
    await saveScreenshot(mcp, 'fade_step2_dim.png');

    // Frame 29 (Step 4: Medium Dim)
    for (let f = 24; f <= 29; f++) await mcp.callTool('debug_step_frame', {});
    await saveScreenshot(mcp, 'fade_step3_mid.png');

    // Frame 35 (Step 2: Brightening)
    for (let f = 30; f <= 35; f++) await mcp.callTool('debug_step_frame', {});
    await saveScreenshot(mcp, 'fade_step4_bright.png');

    // Frame 41 (Step 0: 100% Full Original Scene)
    for (let f = 36; f <= 41; f++) await mcp.callTool('debug_step_frame', {});
    await saveScreenshot(mcp, 'fade_step5_full.png');

    mcp.stop();
    console.log('Visual fade in progression captured successfully!');
  } catch (err) {
    console.error('Error during fade test:', err);
    try { mcp.stop(); } catch (e) {}
    process.exit(1);
  }
})();
