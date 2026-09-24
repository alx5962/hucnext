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
  // Wait 60 frames for scene 5 to load and fade in
  for (let i = 0; i < 60; i++) await m.callTool('debug_step_frame', {});

  console.log('Moving LEFT for 80 frames...');
  await m.callTool('controller_button', { player: 1, button: 'left', action: 'press' });
  for (let i = 0; i < 80; i++) await m.callTool('debug_step_frame', {});
  await m.callTool('controller_button', { player: 1, button: 'left', action: 'release' });

  const snap1 = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'after_walk_left.png'), Buffer.from(snap1.content[0].data, 'base64'));
  console.log('Saved after_walk_left.png');

  console.log('Moving UP for 120 frames...');
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'press' });
  for (let i = 0; i < 120; i++) await m.callTool('debug_step_frame', {});
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'release' });

  const snap2 = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'after_walk_up.png'), Buffer.from(snap2.content[0].data, 'base64'));
  console.log('Saved after_walk_up.png');

  m.stop();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
