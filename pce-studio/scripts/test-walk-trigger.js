const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

(async () => {
  const m = new GeargrafxMCP();
  await m.start();
  const brainDir = 'C:/Users/alx59/.gemini/antigravity-ide/brain/9ace62e7-1ad2-459b-bd16-9fa462fced24';

  console.log('Stepping to title screen (240 frames)...');
  for (let i = 0; i < 240; i++) await m.callTool('debug_step_frame', {});

  console.log('Pressing START on Title screen...');
  await m.callTool('controller_button', { player: 1, button: 'run', action: 'press_and_release' });
  for (let i = 0; i < 30; i++) await m.callTool('debug_step_frame', {});

  console.log('Pressing button I (A) to select New Game...');
  await m.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  for (let i = 0; i < 60; i++) await m.callTool('debug_step_frame', {});

  console.log('Moving right for 40 frames...');
  await m.callTool('controller_button', { player: 1, button: 'right', action: 'press' });
  for (let i = 0; i < 40; i++) await m.callTool('debug_step_frame', {});
  await m.callTool('controller_button', { player: 1, button: 'right', action: 'release' });

  console.log('Moving up for 160 frames...');
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'press' });
  for (let i = 0; i < 160; i++) {
    await m.callTool('debug_step_frame', {});
    if (i % 20 === 0) {
      const snap = await m.callTool('get_screenshot', {});
      fs.writeFileSync(path.join(brainDir, `walk_ru_${i}.png`), Buffer.from(snap.content[0].data, 'base64'));
    }
  }
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'release' });

  const snap = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'walk_ru_final.png'), Buffer.from(snap.content[0].data, 'base64'));
  console.log('Saved walk_ru_final.png');
  m.stop();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
