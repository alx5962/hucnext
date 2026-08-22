/**
 * Targeted BRAM test:
 * - Break at _bm_check to capture its return value
 * - Need to trigger save_game() by simulating gameplay to the cave scene
 * 
 * Strategy: pause CPU, manually call save_game by writing to PC at the 
 * save_game function address (bank 18 = ROM page 0x18, address 0xa308)
 * 
 * Actually simpler: Just set a breakpoint and fast-forward, then check if 
 * BRAM area appears after bm_check is called.
 */
const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');

async function stepFrames(mcp, n) {
  for (let i = 0; i < n; i++) await mcp.callTool('debug_step_frame', {});
}

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();
  
  // Fast forward through title screen
  await mcp.callTool('toggle_fast_forward', { enabled: true });
  await stepFrames(mcp, 300);
  await mcp.callTool('toggle_fast_forward', { enabled: false });

  // Check memory areas now
  const areas = await mcp.callTool('list_memory_areas', {});
  const areasList = JSON.parse(areas.content[0].text);
  console.log('Memory areas:', areasList.areas.map(a => a.name));

  // Press I to start
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 30);
  // Press I to select New Game
  await mcp.callTool('controller_button', { player: 1, button: 'I', action: 'press_and_release' });
  await stepFrames(mcp, 120);

  // Check memory areas again after game started
  const areas2 = await mcp.callTool('list_memory_areas', {});
  const areasList2 = JSON.parse(areas2.content[0].text);
  console.log('Memory areas after new game:', areasList2.areas.map(a => a.name));

  // Now check what's at logical $8000 (BRAM when MPR4=$F7)
  // First get CPU state to see MPR values
  const cpu = await mcp.callTool('get_huc6280_status', {});
  const cpuData = JSON.parse(cpu.content[0].text);
  console.log('MPRs:', cpuData.MPR.map(m => `MPR${m.index}=${m.value}`).join(', '));

  // Read WRAM (size param is required)
  console.log('Reading WRAM 64 bytes...');
  const wram = await mcp.callTool('read_memory', { area: 'WRAM', offset: 0, size: 64 });
  console.log('WRAM[0..63]:', wram.content[0].text.substring(0, 300));

  mcp.stop();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
