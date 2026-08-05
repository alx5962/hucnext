const GeargrafxMCP = require("./geargrafx-mcp-client");

const romPath = "C:\\Users\\alx59\\Documents\\PCEtest1\\build\\rom\\pcetest1.pce";
const mcp = new GeargrafxMCP(romPath);

(async () => {
  try {
    await mcp.start();

    for (let i = 0; i < 20; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    // Read Palettes (area 8)
    const palettes = await mcp.callTool("read_memory", {
      area: 8,
      offset: "0x0000",
      size: 32
    });
    console.log("=== PALETTES MEMORY ===");
    console.log(palettes.content[0].text);

    // Read VRAM BAT Map (area 4 offset 0)
    const vramMap = await mcp.callTool("read_memory", {
      area: 4,
      offset: "0x0000",
      size: 64
    });
    console.log("=== VRAM BAT MAP ===");
    console.log(vramMap.content[0].text);

    // Read VRAM Tileset Patterns (area 4 offset 0x1000)
    const vramTiles = await mcp.callTool("read_memory", {
      area: 4,
      offset: "0x1000",
      size: 64
    });
    console.log("=== VRAM TILESET PATTERNS ===");
    console.log(vramTiles.content[0].text);

    mcp.stop();
  } catch (err) {
    console.error("Error:", err);
    mcp.stop();
  }
})();
