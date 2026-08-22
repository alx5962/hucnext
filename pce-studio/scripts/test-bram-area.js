/**
 * Test if Geargrafx exposes BRAM as a writable memory area.
 * Try area IDs 2, 5, 7 which were missing from list_memory_areas.
 * Also try directly writing to WRAM offset where BRAM data would be stored
 * via the game's bm_unlock path (logical $8000 when MPR4=$F7).
 */
const GeargrafxMCP = require('./geargrafx-mcp-client');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Run 10 frames so ROM is loaded
  for (let i = 0; i < 10; i++) await mcp.callTool('debug_step_frame', {});

  // Try area IDs that were not listed
  for (const areaId of [2, 5, 7]) {
    try {
      const res = await mcp.callTool('read_memory', { area: areaId, offset: '0x0000', size: 16 });
      console.log(`Area ${areaId}: READ OK -`, res.content[0].text.substring(0, 100));
    } catch(e) {
      console.log(`Area ${areaId}: read error -`, e.message || JSON.stringify(e));
    }
  }

  // Try to get Card RAM area with known BRAM header
  // BRAM header "HUBM" at physical block $F7 = logical $8000 when MPR4=$F7
  // Try writing to ROM area at offset of bank $F7 (= $F7 * 0x2000 = 0x1EE000... too large for 212992 byte ROM)
  // ROM is 212992 = 0x33F80 bytes. Bank $F7 * 8192 = 0x1EE000 - way beyond ROM size

  // Try read_memory with "Card RAM" or "BRAM" name string  
  for (const areaName of ['Card RAM', 'BRAM', 'Backup RAM', 'backup_ram']) {
    try {
      const res = await mcp.callTool('read_memory', { area: areaName, offset: '0x0000', size: 16 });
      console.log(`Area "${areaName}": READ OK -`, res.content[0].text.substring(0, 100));
    } catch(e) {
      console.log(`Area "${areaName}": error -`, e.message || JSON.stringify(e));
    }
  }

  mcp.stop();
  console.log('Done');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
