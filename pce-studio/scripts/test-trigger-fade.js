const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

(async () => {
  const m = new GeargrafxMCP();
  await m.start();
  const brainDir = path.resolve('C:/Users/alx59/.gemini/antigravity-ide/brain/9ace62e7-1ad2-459b-bd16-9fa462fced24');

  console.log('Stepping to title screen (240 frames)...');
  for (let i = 0; i < 240; i++) {
    await m.callTool('debug_step_frame', {});
  }

  // Press START to dismiss Title Screen input await
  console.log('Pressing START on Title screen...');
  await m.callTool('controller_button', { player: 1, button: 'run', action: 'press_and_release' });
  for (let i = 0; i < 30; i++) await m.callTool('debug_step_frame', {});

  // On Choice ("New Game" / "Continue"), New Game is selected by default, press button I (A)
  console.log('Pressing button I (A) to select New Game...');
  await m.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  for (let i = 0; i < 30; i++) await m.callTool('debug_step_frame', {});

  // Now we should be entering Outside scene or faded in
  console.log('Taking screenshot of Outside scene entry...');
  let res = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'outside_entry.png'), Buffer.from(res.content[0].data, 'base64'));

  // Let Outside fade in completely (60 frames)
  for (let i = 0; i < 60; i++) await m.callTool('debug_step_frame', {});
  res = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'outside_ready.png'), Buffer.from(res.content[0].data, 'base64'));

  // Outside player start position is (216, 200).
  // Trigger 0 is at tile (26, 13) = (208, 104).
  // Player is at x=27 (216), y=26 (200).
  // To reach tile (26, 13), player must walk:
  // Left 1 tile: 216 -> 208
  // Up 13 tiles: 200 -> 104
  console.log('Moving player UP towards trigger...');
  await m.callTool('controller_button', { player: 1, button: 'left', action: 'press' });
  for (let i = 0; i < 16; i++) await m.callTool('debug_step_frame', {});
  await m.callTool('controller_button', { player: 1, button: 'left', action: 'release' });

  await m.callTool('controller_button', { player: 1, button: 'up', action: 'press' });
  // Walk up until trigger hits (step and monitor frame by frame or 120 frames)
  // Let's capture frames while moving up
  for (let f = 0; f < 180; f++) {
    await m.callTool('debug_step_frame', {});
    if (f % 10 === 0) {
      const snap = await m.callTool('get_screenshot', {});
      fs.writeFileSync(path.join(brainDir, `walk_${f}.png`), Buffer.from(snap.content[0].data, 'base64'));
    }
  }
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'release' });

  // Now let's capture the next 30 frames to see the transition!
  console.log('Capturing transition frames...');
  for (let f = 0; f < 30; f++) {
    await m.callTool('debug_step_frame', {});
    const snap = await m.callTool('get_screenshot', {});
    fs.writeFileSync(path.join(brainDir, `trans_${f}.png`), Buffer.from(snap.content[0].data, 'base64'));
  }

  console.log('Done!');
  m.stop();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
