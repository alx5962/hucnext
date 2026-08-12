const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const outPngPath = process.argv[2] || path.resolve(__dirname, "../geargfx_preview.png");
const frameCount = parseInt(process.argv[3] || "60", 10);
const romPath = process.argv[4] || path.resolve(__dirname, "../build_tmp/main.pce");

if (!fs.existsSync(romPath)) {
  console.error(`ROM file not found at: ${romPath}`);
  process.exit(1);
}

const outDir = path.dirname(outPngPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const mcp = new GeargrafxMCP(romPath);

(async () => {
  try {
    console.log(`Starting Geargrafx MCP with ROM: ${romPath}`);
    await mcp.start();

    console.log(`Stepping ${frameCount} frames...`);
    for (let i = 0; i < frameCount; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    console.log("Capturing screenshot...");
    const res = await mcp.callTool("get_screenshot", {});
    const base64Data = res.content && res.content[0] ? res.content[0].data : null;
    
    if (base64Data) {
      fs.writeFileSync(outPngPath, Buffer.from(base64Data, "base64"));
      console.log(`Screenshot saved successfully to: ${outPngPath}`);
    } else {
      console.error("Failed to retrieve screenshot data from Geargrafx MCP response.");
    }

    mcp.stop();
    process.exit(0);
  } catch (err) {
    console.error("Geargrafx error:", err);
    mcp.stop();
    process.exit(1);
  }
})();
