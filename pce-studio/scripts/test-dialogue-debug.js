const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const outPng = path.resolve(__dirname, "../test_dialogue_out.png");

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  await mcp.start();

  console.log("Stepping 30 frames to let scene initialize...");
  for (let i = 0; i < 30; i++) {
    await mcp.callTool("debug_step_frame", {});
  }

  console.log("Holding right for 120 frames...");
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });
  for (let i = 0; i < 120; i++) {
    await mcp.callTool("debug_step_frame", {});
  }
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });

  console.log("Pressing button I to interact with actor...");
  await mcp.callTool("controller_button", { player: 1, button: "I", action: "press" });
  for (let i = 0; i < 5; i++) {
    await mcp.callTool("debug_step_frame", {});
  }
  await mcp.callTool("controller_button", { player: 1, button: "I", action: "release" });

  console.log("Stepping 20 frames...");
  for (let i = 0; i < 20; i++) {
    await mcp.callTool("debug_step_frame", {});
  }

  console.log("Capturing screenshot...");
  const res = await mcp.callTool("get_screenshot", {});
  if (res.content && res.content[0] && res.content[0].data) {
    fs.writeFileSync(outPng, Buffer.from(res.content[0].data, "base64"));
    console.log("Saved screenshot to:", outPng);
  }

  // Read BAT (area 4, offset 0x0000)
  // BAT is at VRAM 0x0000. 32 columns x 32 rows = 1024 words = 2048 bytes.
  // Row 23 is offset 23 * 32 = 736 words = 0x02E0 hex offset.
  const batRes = await mcp.callTool("read_memory", {
    area: 4,
    offset: "02E0", // row 23
    size: 5 * 32 * 2 // 5 rows
  });
  console.log("BAT at rows 23-27:", batRes.content ? batRes.content[0].text : batRes);

  // Read Palettes (area 8)
  // Palettes: 512 words. Palette 14 is at offset 14 * 16 = 224 = 0x00E0.
  // Palette 15 is at offset 15 * 16 = 240 = 0x00F0.
  const palRes = await mcp.callTool("read_memory", {
    area: 8,
    offset: "00E0",
    size: 32 * 2 // Palettes 14 & 15
  });
  console.log("Palettes 14 & 15:", palRes.content ? palRes.content[0].text : palRes);

  // Read font in VRAM (area 4, offset 0x4800)
  const vramFontRes = await mcp.callTool("read_memory", {
    area: 4,
    offset: "4800",
    size: 64 // first 2 tiles
  });
  console.log("VRAM at 0x4800 (first 2 font tiles):", vramFontRes.content ? vramFontRes.content[0].text : vramFontRes);

  mcp.stop();
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
