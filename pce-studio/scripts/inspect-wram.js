const GeargrafxMCP = require('./geargrafx-mcp-client');
const ROM = 'c:/workspace/git/LegendOfZeldaNESRecomp/build_pce/zelda.pce';
const mcp = new GeargrafxMCP(ROM);
(async () => {
  await mcp.start();
  
  // List memory areas
  const r = await mcp.callTool('list_memory_areas', {});
  const text = r.content && r.content[0] ? r.content[0].text : '';
  console.log('Memory Areas:\n' + text);
  
  // Step 60 frames to get to a stable state
  await mcp.callTool('debug_step_frame', { frames: 60 });
  
  // Try reading from WRAM using cpu_addr area (area 0) and the full CPU address
  // The main.sym shows addresses like 0x28a3 which are CPU addresses
  // Let's try area=0 (cpu_addr) with offset "28a3"
  try {
    const mem = await mcp.callTool('read_memory', { area: 0, offset: '28a3', size: 8 });
    console.log('cpu_addr 0x28a3 read:', JSON.stringify(mem.content));
  } catch(e) { console.log('cpu_addr read error:', e); }

  // Also try WRAM area with offset 0x6a3 (= 0x28a3 - 0x2000)
  try {
    const mem2 = await mcp.callTool('read_memory', { area: 6, offset: '6a3', size: 8 });
    console.log('WRAM 0x6a3 read:', JSON.stringify(mem2.content));
  } catch(e) { console.log('WRAM read error:', e); }
  
  // Also try WRAM with offset 0 to see if it reads from 0x2000
  try {
    const mem3 = await mcp.callTool('read_memory', { area: 6, offset: '0', size: 16 });
    console.log('WRAM offset 0 read:', JSON.stringify(mem3.content));
  } catch(e) { console.log('WRAM offset 0 error:', e); }

  mcp.stop();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
