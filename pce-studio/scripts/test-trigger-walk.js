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

  // Press START on Title screen
  console.log('Pressing START on Title screen...');
  await m.callTool('controller_button', { player: 1, button: 'run', action: 'press_and_release' });
  for (let i = 0; i < 30; i++) await m.callTool('debug_step_frame', {});

  // Select New Game
  console.log('Pressing button I (A) to select New Game...');
  await m.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  
  // Wait for Outside scene to load and finish its fade-in (60 frames)
  for (let i = 0; i < 60; i++) await m.callTool('debug_step_frame', {});

  // Check current scene from WRAM offset $3CC2 - $2000 = $1CC2
  let scRes = await m.callTool('read_memory', { area: 0, offset: '1CC2', size: 2 });
  console.log('Scene read result:', JSON.stringify(scRes));

  // Now, position player right below Trigger 0.
  // Trigger 0 is at tile (26, 13) -> x=208, y=104.
  // Let's set player pos to x=208 (0x00D0), y=112 (0x0070).
  // _g_actor_x[0] is at $2F33 -> WRAM offset 0x0F33.
  // _g_actor_y[0] is at $2F73 -> WRAM offset 0x0F73.
  // Also g_plat_sub_x, etc if needed, but topdown uses g_actor_x and g_actor_y.
  console.log('Positioning player at x=208, y=112 (just below trigger)...');
  // write 208 (0x00D0) to 0x0F33
  await m.callTool('write_memory', { area: 0, offset: '0F33', bytes: 'D0 00' });
  // write 112 (0x0070) to 0x0F73
  await m.callTool('write_memory', { area: 0, offset: '0F73', bytes: '70 00' });

  // Take screenshot before stepping onto trigger
  let snap = await m.callTool('get_screenshot', {});
  fs.writeFileSync(path.join(brainDir, 'before_trigger.png'), Buffer.from(snap.content[0].data, 'base64'));

  // Now press UP to step into trigger
  console.log('Stepping UP onto trigger...');
  await m.callTool('controller_button', { player: 1, button: 'up', action: 'press' });

  // Step 60 frames and capture EACH frame, plus palette info
  for (let f = 0; f < 60; f++) {
    await m.callTool('debug_step_frame', {});
    
    // Check fade_step ($3CB8 -> 0x1CB8), fade_active ($3CC0 -> 0x1CC0), current_scene (0x1CC2)
    const fadeMem = await m.callTool('read_memory', { area: 0, offset: '1CB8', size: 12 });
    const palMem = await m.callTool('read_memory', { area: 8, offset: '0000', size: 32 }); // first 16 colors
    
    snap = await m.callTool('get_screenshot', {});
    fs.writeFileSync(path.join(brainDir, `trig_fade_${String(f).padStart(2, '0')}.png`), Buffer.from(snap.content[0].data, 'base64'));
    
    console.log(`Frame ${f}: fadeMem=${JSON.stringify(fadeMem.content[0]?.text)} Pal0=${JSON.stringify(palMem.content[0]?.text)}`);
  }

  await m.callTool('controller_button', { player: 1, button: 'up', action: 'release' });
  console.log('Done!');
  m.stop();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
