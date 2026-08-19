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
    
    console.log("1. Running Logo scene (150 frames)...");
    for (let i = 0; i < 150; i++) await mcp.callTool("debug_step_frame", {});
    await saveScreenshot(mcp, "title_step1_before_start.png");

    console.log("2. Pressing Start to proceed past 'Pause Script Until Pressed'...");
    await mcp.callTool("controller_button", { player: 1, button: "run", action: "press_and_release" });
    for (let i = 0; i < 20; i++) await mcp.callTool("debug_step_frame", {});
    await saveScreenshot(mcp, "title_step2_choice_menu.png");

    console.log("3. Pressing DOWN to select 'Continue'...");
    await mcp.callTool("controller_button", { player: 1, button: "down", action: "press_and_release" });
    for (let i = 0; i < 20; i++) await mcp.callTool("debug_step_frame", {});
    await saveScreenshot(mcp, "title_step3_continue_selected.png");

    mcp.stop();
    console.log("Done!");
  } catch (e) {
    console.error("Error:", e);
    mcp.stop();
  }
})();
