const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

(async () => {
  const m = new GeargrafxMCP();
  await m.start();
  const brainDir = 'C:/Users/alx59/.gemini/antigravity-ide/brain/9ace62e7-1ad2-459b-bd16-9fa462fced24';

  console.log('Stepping 30 frames for Outside scene to load and fade in...');
  for (let i = 0; i < 30; i++) await m.callTool('debug_step_frame', {});

  const snapStart = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'direct_start.png'), Buffer.from(snapStart.content[0].data, 'base64'));
  console.log('Saved direct_start.png');

  console.log('Stepping UP into Trigger 0...');
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'press' });

  // Walk up into trigger and capture frame by frame
  for (let i = 0; i < 40; i++) {
    await m.callTool('debug_step_frame', {});
    const snap = await m.callTool('get_screenshot', {});
    fs.writeFileSync(path.join(brainDir, `direct_step_${i}.png`), Buffer.from(snap.content[0].data, 'base64'));
  }
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'release' });

  // Step another 30 frames to let fade-in complete in Underground
  for (let i = 0; i < 30; i++) {
    await m.callTool('debug_step_frame', {});
  }

  const snapUnderground = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'direct_underground.png'), Buffer.from(snapUnderground.content[0].data, 'base64'));
  console.log('Saved direct_underground.png');

  m.stop();
  console.log('Direct trigger test completed successfully.');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
