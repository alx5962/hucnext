const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

(async () => {
  const m = new GeargrafxMCP();
  await m.start();
  const brainDir = 'C:/Users/alx59/.gemini/antigravity-ide/brain/9ace62e7-1ad2-459b-bd16-9fa462fced24';

  console.log('Capturing frames on spawn/trigger...');
  for (let i = 0; i < 40; i++) {
    await m.callTool('debug_step_frame', {});
    const snap = await m.callTool('get_screenshot', {});
    fs.writeFileSync(path.join(brainDir, `spawn_frame_${i}.png`), Buffer.from(snap.content[0].data, 'base64'));
  }

  m.stop();
  console.log('Done capturing spawn frames.');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
