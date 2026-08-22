/**
 * Debug BRAM: Set breakpoint at _bm_check return to check if it returns 0 or 1.
 * Also set a breakpoint at _save_game to trace execution.
 * _bm_check is at bank 00, address f6e6
 * _save_game is at bank 18, address a308
 */
const GeargrafxMCP = require('./geargrafx-mcp-client');
const fs = require('fs');
const path = require('path');

const romPath = path.resolve('build_tmp/main.pce');
const symPath = path.resolve('build_tmp/main.sym');
const outPng = 'C:/Users/alx59/.gemini/antigravity-ide/brain/daf8e627-20e4-4b05-b7c4-a324891bb86a/geargfx_preview.png';

async function stepFrames(mcp, n) {
  for (let i = 0; i < n; i++) await mcp.callTool('debug_step_frame', {});
}

async function screenshot(mcp) {
  const res = await mcp.callTool('get_screenshot', {});
  if (res.content && res.content[0]) {
    fs.writeFileSync(outPng, Buffer.from(res.content[0].data, 'base64'));
  }
}

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  // Load symbols
  await mcp.callTool('load_symbols', { file_path: symPath });

  // Set breakpoint at _bm_check (bank 0x00, address 0xf6e6)
  // bm_check returns: X=1, A=0, carry clear = BRAM exists; X=0, carry set = no BRAM
  // The RTS is a few bytes after f6e6... let's break at the function start to trace
  console.log('Setting breakpoint at _bm_check (bank 0, addr 0xf6e6)...');
  await mcp.callTool('set_breakpoint', { address: '0xf6e6' });

  // Run frames
  console.log('Running 60 frames...');
  await stepFrames(mcp, 60);

  // Check if we hit the breakpoint (bm_check called during init)
  const status = await mcp.callTool('debug_get_status', {});
  console.log('Status after 60 frames:', JSON.stringify(status.content.map(c => c.text).join('')));

  const cpuState = await mcp.callTool('get_huc6280_status', {});
  console.log('CPU state:', JSON.stringify(cpuState.content.map(c => c.text).join('').substring(0, 500)));

  await screenshot(mcp);
  mcp.stop();
  console.log('Done. Check screenshot.');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
