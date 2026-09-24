const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactDir = "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\9ace62e7-1ad2-459b-bd16-9fa462fced24";

const mcp = new GeargrafxMCP(romPath);

async function sleepFrames(n) {
  for (let i = 0; i < n; i++) {
    await mcp.callTool("debug_step_frame", {});
  }
}

async function capture(name) {
  const res = await mcp.callTool("get_screenshot", {});
  const buf = Buffer.from(res.content[0].data, "base64");
  fs.writeFileSync(path.join(artifactDir, name), buf);
  console.log("Saved:", name);
}

(async () => {
  try {
    await mcp.start();
    await sleepFrames(140);
    await sleepFrames(30);

    // Press run to dismiss PRESS START
    await mcp.callTool("controller_button", { player: 1, button: "run", action: "press" });
    await sleepFrames(5);
    await mcp.callTool("controller_button", { player: 1, button: "run", action: "release" });
    await sleepFrames(60);

    // Capture choice screen
    await capture("choice_shown.png");

    // Try pressing "I"
    console.log("Trying I...");
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press" });
    await sleepFrames(10);
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "release" });
    await sleepFrames(30);
    await capture("after_I.png");

    // Try pressing "run"
    console.log("Trying run...");
    await mcp.callTool("controller_button", { player: 1, button: "run", action: "press" });
    await sleepFrames(10);
    await mcp.callTool("controller_button", { player: 1, button: "run", action: "release" });
    await sleepFrames(30);
    await capture("after_run.png");

    // Try pressing "II"
    console.log("Trying II...");
    await mcp.callTool("controller_button", { player: 1, button: "II", action: "press" });
    await sleepFrames(10);
    await mcp.callTool("controller_button", { player: 1, button: "II", action: "release" });
    await sleepFrames(30);
    await capture("after_II.png");

    mcp.stop();
  } catch(e) {
    console.error(e);
    try { mcp.stop(); } catch(err){}
  }
})();
