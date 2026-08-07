const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactDir = process.env.ARTIFACT_DIR || "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\6e785bf3-1811-41d1-84c4-73dafd6d76fb";
const noInteractPath = path.join(artifactDir, "media__no_interaction_screenshot.png");
const activeDialoguePath = path.join(artifactDir, "media__active_dialogue_screenshot.png");
const outPngPath = path.join(artifactDir, "media__emulator_screenshot.png");

const mcp = new GeargrafxMCP(romPath);

(async () => {
  try {
    await mcp.start();

    // 1. Initial state (no interaction)
    for (let i = 0; i < 30; i++) {
      await mcp.callTool("debug_step_frame", {});
    }
    const resNo = await mcp.callTool("get_screenshot", {});
    fs.writeFileSync(noInteractPath, Buffer.from(resNo.content[0].data, "base64"));

    // 2. Open dialogue with button I
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press_and_release" });
    for (let i = 0; i < 15; i++) {
      await mcp.callTool("debug_step_frame", {});
    }
    const resActive = await mcp.callTool("get_screenshot", {});
    fs.writeFileSync(activeDialoguePath, Buffer.from(resActive.content[0].data, "base64"));

    // 3. Press button I again to close dialogue
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press_and_release" });
    for (let i = 0; i < 15; i++) {
      await mcp.callTool("debug_step_frame", {});
    }
    const resEnded = await mcp.callTool("get_screenshot", {});
    fs.writeFileSync(outPngPath, Buffer.from(resEnded.content[0].data, "base64"));

    console.log("Saved screenshots successfully.");
    mcp.stop();

    mcp.stop();
  } catch (err) {
    console.error("Error:", err);
    mcp.stop();
  }
})();
