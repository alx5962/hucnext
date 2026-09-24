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

  console.log('Moving LEFT for 80 frames...');
  await m.callTool('controller_button', { player: 1, button: 'left', action: 'press' });
  for (let i = 0; i < 80; i++) await m.callTool('debug_step_frame', {});
  await m.callTool('controller_button', { player: 1, button: 'left', action: 'release' });

  console.log('Moving UP for 150 frames (past tree, clear of pond)...');
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'press' });
  for (let i = 0; i < 150; i++) await m.callTool('debug_step_frame', {});
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'release' });

  const snapUp = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'above_pond.png'), Buffer.from(snapUp.content[0].data, 'base64'));
  console.log('Saved above_pond.png');

  console.log('Moving RIGHT towards cave entrance (130 frames)...');
  await m.callTool('controller_button', { player: 1, button: 'right', action: 'press' });
  for (let i = 0; i < 130; i++) {
    await m.callTool('debug_step_frame', {});
    // When approaching and during the transition: capture frames
    if (i >= 80 && i <= 125) {
      const snap = await m.callTool('get_screenshot', {});
      fs.writeFileSync(path.join(brainDir, `cave_fade_${i}.png`), Buffer.from(snap.content[0].data, 'base64'));
    }
  }
  await m.callTool('controller_button', { player: 1, button: 'right', action: 'release' });

  for (let i = 0; i < 30; i++) {
    await m.callTool('debug_step_frame', {});
  }
  const snapFinal = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'cave_final.png'), Buffer.from(snapFinal.content[0].data, 'base64'));
  console.log('Saved cave_final.png');

  m.stop();
  console.log('Done!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
