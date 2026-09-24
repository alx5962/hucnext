const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

(async () => {
  const m = new GeargrafxMCP();
  await m.start();
  const brainDir = 'C:/Users/alx59/.gemini/antigravity-ide/brain/9ace62e7-1ad2-459b-bd16-9fa462fced24';

  console.log('Stepping 25 frames for Outside to fade in...');
  for (let i = 0; i < 25; i++) await m.callTool('debug_step_frame', {});

  console.log('Pressing UP to walk into trigger...');
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'press' });

  for (let f = 0; f < 35; f++) {
    await m.callTool('debug_step_frame', {});
    const snap = await m.callTool('get_screenshot', {});
    fs.writeFileSync(path.join(brainDir, `trig_step_${f}.png`), Buffer.from(snap.content[0].data, 'base64'));
  }
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'release' });

  m.stop();
  console.log('Trigger walk test done!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
