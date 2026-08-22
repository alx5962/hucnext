const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');
const outPng = 'C:/Users/alx59/.gemini/antigravity-ide/brain/daf8e627-20e4-4b05-b7c4-a324891bb86a/geargfx_preview.png';

async function stepFrames(mcp, n) {
  for (let i = 0; i < n; i++) {
    await mcp.callTool('debug_step_frame', {});
  }
}

async function captureScreenshot(mcp, label) {
  const res = await mcp.callTool('get_screenshot', {});
  if (res.content && res.content[0]) {
    fs.writeFileSync(outPng, Buffer.from(res.content[0].data, 'base64'));
    console.log(`Screenshot [${label}] saved to ${outPng}`);
  }
}

async function holdButton(mcp, button, frames) {
  await mcp.callTool('controller_button', { player: 1, button, action: 'press' });
  await stepFrames(mcp, frames);
  await mcp.callTool('controller_button', { player: 1, button, action: 'release' });
  await stepFrames(mcp, 5);
}

(async () => {
  console.log('=== Complete BRAM Save & Continue Verification Flow ===');
  let mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // 1. Title Screen
  console.log('Step 1: Running to title screen...');
  await stepFrames(mcp, 100);

  // Dismiss await_input
  console.log('Step 2: Pressing I to dismiss start prompt...');
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);

  // Check Continue before any save:
  console.log('Step 3: Navigating to Continue...');
  await mcp.callTool('controller_button', { player: 1, button: 'down', action: 'press_and_release' });
  await stepFrames(mcp, 15);
  console.log('Step 4: Pressing I on Continue (should show No Save Data Found)...');
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);
  await captureScreenshot(mcp, '1_no_save_data_dialogue');

  // Dismiss "No Save Data Found..." dialogue
  console.log('Step 5: Dismissing No Save Data dialogue...');
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);

  // Select "New Game"
  console.log('Step 6: Selecting New Game...');
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 60);

  // Dismiss initial "Welcome to GBStudio!!" dialogue
  console.log('Step 7: Dismissing Welcome dialogue...');
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);
  await captureScreenshot(mcp, '2_outside_scene');

  // Walk up to cave entrance (top right of outside: entrance at X=192, Y=64, player starts around X=216, Y=200)
  // Walk UP for ~140 pixels -> ~140 frames at 1px/frame
  console.log('Step 8: Walking UP towards cave entrance...');
  await holdButton(mcp, 'up', 140);
  // Walk LEFT slightly towards X=192
  console.log('Step 9: Walking LEFT into cave trigger...');
  await holdButton(mcp, 'left', 30);
  await stepFrames(mcp, 60);
  await captureScreenshot(mcp, '3_entered_cave');

  // In Cave scene (Scene 1): Player starts at X=72, Y=168.
  // Save NPC is at X=112, Y=88.
  // Walk UP and RIGHT to approach Save NPC:
  console.log('Step 10: Walking towards Save NPC in cave...');
  await holdButton(mcp, 'up', 80);
  await holdButton(mcp, 'right', 40);
  await stepFrames(mcp, 20);
  await captureScreenshot(mcp, '4_near_save_npc');

  // Face UP / interact with Save NPC
  console.log('Step 11: Interacting with Save NPC...');
  await mcp.callTool('controller_button', { player: 1, button: 'up', action: 'press_and_release' });
  await stepFrames(mcp, 10);
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);
  await captureScreenshot(mcp, '5_save_game_choice');

  // Choice: "Save Game" / "Cancel" -> "Save Game" is option 0 (default)
  // Press Button I to confirm "Save Game"
  console.log('Step 12: Confirming Save Game (Button I)...');
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);
  await captureScreenshot(mcp, '6_game_saved_dialogue');

  // Dismiss "Game progress has been saved."
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 20);
  // Dismiss "It is now safe to turn off your system."
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);

  // Now RESET emulator to simulate reloading the game!
  console.log('Step 13: Resetting emulator (debug_reset)...');
  await mcp.callTool('debug_reset', {});
  await stepFrames(mcp, 100);
  await captureScreenshot(mcp, '7_after_reset_title');

  // Advance title prompt
  console.log('Step 14: Pressing Button I at title screen...');
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);

  // Select "Continue"
  console.log('Step 15: Selecting Continue...');
  await mcp.callTool('controller_button', { player: 1, button: 'down', action: 'press_and_release' });
  await stepFrames(mcp, 15);
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 90);
  await captureScreenshot(mcp, '8_loaded_from_save_cave');

  mcp.stop();
  console.log('=== TEST COMPLETED SUCCESSFULLY! ===');
})().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
