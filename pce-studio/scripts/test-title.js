const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = "C:/Users/alx59/AppData/Local/Temp/_pcebuild/main.pce";
const brainDir = "C:/Users/alx59/.gemini/antigravity-ide/brain/9e52227b-4dd9-46fb-8a66-70e28df0c7c9";

async function saveScreenshot(mcp, filename) {
  const res = await mcp.callTool("get_screenshot", {});
  const base64Data = res.content && res.content[0] ? res.content[0].data : null;
  if (base64Data) {
    fs.writeFileSync(path.join(brainDir, filename), Buffer.from(base64Data, "base64"));
    console.log(`Saved ${filename}`);
  }
}

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  try {
    await mcp.start();
    console.log("Stepping 60 frames...");
    for (let i = 0; i < 60; i++) await mcp.callTool("debug_step_frame", {});
    await saveScreenshot(mcp, "title_screen_start.png");

    console.log("Pressing Run/Start...");
    await mcp.callTool("controller_button", { player: 1, button: "run", action: "press_and_release" });
    for (let i = 0; i < 30; i++) await mcp.callTool("debug_step_frame", {});
    await saveScreenshot(mcp, "title_screen_after_start.png");

    mcp.stop();
  } catch (e) {
    console.error("Error:", e);
    mcp.stop();
  }
})();
