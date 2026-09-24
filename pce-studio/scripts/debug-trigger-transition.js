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
  const p = path.join(artifactDir, name);
  fs.writeFileSync(p, buf);
  console.log("Saved:", name);
}

(async () => {
  try {
    await mcp.start();
    console.log("MCP started.");

    // Step through logo scene 3 (wait timer 120 + fade)
    console.log("Stepping through logo scene...");
    await sleepFrames(140);

    // In Title Screen (scene 7)
    console.log("In title screen, waiting for fade...");
    await sleepFrames(30);

    // First press: dismiss "PRESS START"
    console.log("Pressing Run to dismiss PRESS START...");
    await mcp.callTool("controller_button", { player: 1, button: "run", action: "press" });
    await sleepFrames(5);
    await mcp.callTool("controller_button", { player: 1, button: "run", action: "release" });

    // Wait for choice dialogue to show and cooldown to pass
    await sleepFrames(60);

    // Title screen shows choice: option 0 = New Game
    // Press button I to select New Game
    console.log("Pressing Button I to choose New Game...");
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "press" });
    await sleepFrames(10);
    await mcp.callTool("controller_button", { player: 1, button: "I", action: "release" });

    // Wait for Outside scene (5) to load and fade in
    console.log("Waiting for Outside scene (5) to load and fade in...");
    await sleepFrames(90);

    // Player starts at (216, 200) in Scene 5.
    // Trigger to scene 1 (house) is at (192, 64) with size (16, 8)
    // Trigger to scene 8 (underground) is at (208, 104) with size (8, 8)
    // Notice player is at X=216, Y=200!
    // Trigger to scene 8 is at X=208..216, Y=104!
    // Walking UP (Y from 200 down to 104) will hit trigger to underground directly!
    // Let's capture Outside before walking:
    await capture("trans_before_walk.png");

    console.log("Walking UP towards trigger (underground at Y=104)...");
    await mcp.callTool("controller_button", { player: 1, button: "up", action: "press" });

    // Walk up step by step until trigger is reached
    // Each frame, check if scene changes or let's capture when scene changes
    let sceneChanged = false;
    for (let f = 0; f < 120; f++) {
      await mcp.callTool("debug_step_frame", {});
      // Every 10 frames check or just capture
      if (f >= 50 && f <= 80) {
        // We might be near trigger!
        // Let's capture each frame to see the transition
        await capture(`trans_frame_${f}.png`);
      }
    }
    await mcp.callTool("controller_button", { player: 1, button: "up", action: "release" });

    // Step another 30 frames
    for (let f = 81; f <= 100; f++) {
      await mcp.callTool("debug_step_frame", {});
      await capture(`trans_frame_${f}.png`);
    }

    mcp.stop();
    console.log("Done!");
  } catch (err) {
    console.error("Error:", err);
    try { mcp.stop(); } catch(e){}
  }
})();
