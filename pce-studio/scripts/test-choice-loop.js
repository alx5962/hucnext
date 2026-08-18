const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = "C:/Users/alx59/AppData/Local/Temp/_pcebuild/main.pce";
const brainDir = "C:/Users/alx59/.gemini/antigravity-ide/brain/9e52227b-4dd9-46fb-8a66-70e28df0c7c9";

async function saveScreenshot(mcp, filename) {
  const res = await mcp.callTool("get_screenshot", {});
  const base64Data = res.content && res.content[0] ? res.content[0].data : null;
  if (base64Data) {
    const outPath = path.join(brainDir, filename);
    fs.writeFileSync(outPath, Buffer.from(base64Data, "base64"));
    console.log(`Saved ${filename}`);
  }
}

async function stepFrames(mcp, count) {
  for (let i = 0; i < count; i++) {
    await mcp.callTool("debug_step_frame", {});
  }
}

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  try {
    console.log("Starting Geargrafx MCP...");
    await mcp.start();

    // 1. Initial Choice Menu
    await stepFrames(mcp, 60);
    await saveScreenshot(mcp, "geargfx_choice1_initial.png");

    // 2. Press Down arrow
    console.log("Pressing DOWN...");
    await mcp.callTool("controller_button", { player: 1, button: "down", action: "press_and_release" });
    await stepFrames(mcp, 15);
    await saveScreenshot(mcp, "geargfx_choice2_down.png");

    // 3. Confirm with Button I (Confirm 'toto' -> false -> display 'no')
    console.log("Pressing Button I (Confirm)...");
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press_and_release" });
    await stepFrames(mcp, 15);
    await saveScreenshot(mcp, "geargfx_choice3_result_no.png");

    // 4. Press Button I to dismiss dialogue and trigger loop back
    console.log("Pressing Button I (Dismiss dialogue to loop back)...");
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press_and_release" });
    await stepFrames(mcp, 15);
    await saveScreenshot(mcp, "geargfx_choice4_loop_back.png");

    mcp.stop();
    console.log("Done test sequence!");
  } catch (e) {
    console.error("Test error:", e);
    mcp.stop();
  }
})();
