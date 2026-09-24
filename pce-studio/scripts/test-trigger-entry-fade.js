const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactDir = "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\9ace62e7-1ad2-459b-bd16-9fa462fced24";

async function stepFrames(mcp, count) {
  for (let i = 0; i < count; i++) {
    await mcp.callTool("debug_step_frame", {});
  }
}

async function holdButton(mcp, button, frames) {
  await mcp.callTool("controller_button", { player: 1, button, action: "press" });
  await stepFrames(mcp, frames);
  await mcp.callTool("controller_button", { player: 1, button, action: "release" });
  await stepFrames(mcp, 5);
}

async function captureScreenshot(mcp, filename) {
  const res = await mcp.callTool("get_screenshot", {});
  const base64Data = res.content && res.content[0] ? res.content[0].data : null;
  if (base64Data) {
    const outPath = path.join(artifactDir, filename + ".png");
    fs.writeFileSync(outPath, Buffer.from(base64Data, "base64"));
    console.log(`Saved ${filename}.png`);
  }
}

(async () => {
  const mcp = new GeargrafxMCP(romPath);
  try {
    await mcp.start();
    console.log("Started MCP...");

    // 1. Title screen
    await stepFrames(mcp, 100);

    // 2. Dismiss start prompt
    console.log("Dismissing start prompt...");
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press_and_release" });
    await stepFrames(mcp, 30);

    // 3. Select New Game
    console.log("Selecting New Game...");
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press_and_release" });
    await stepFrames(mcp, 60);

    // 4. Dismiss Welcome dialogue
    console.log("Dismissing Welcome dialogue...");
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press_and_release" });
    await stepFrames(mcp, 30);

    // 5. Walk UP
    console.log("Walking UP towards cave...");
    await holdButton(mcp, "up", 140);

    // 6. Walk LEFT towards cave trigger (around 20-30 steps)
    // We will do this frame by frame to catch the exact moment of transition
    console.log("Walking LEFT into cave trigger frame-by-frame...");
    await mcp.callTool("controller_button", { player: 1, button: "left", action: "press" });

    for (let f = 1; f <= 50; f++) {
      await mcp.callTool("debug_step_frame", {});
      await captureScreenshot(mcp, `trig_step_${String(f).padStart(2, '0')}`);
    }

    await mcp.callTool("controller_button", { player: 1, button: "left", action: "release" });
    mcp.stop();
    console.log("All trigger frames captured!");
  } catch(e) {
    console.error("Error:", e);
    try { mcp.stop(); } catch(err){}
  }
})();
