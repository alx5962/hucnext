const GeargrafxMCP = require("./geargrafx-mcp-client");
const fs = require("fs");
const path = require("path");

const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactDir = "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\c3a09e3f-4072-4820-a4bb-b83205c5b5d7";
const outPngPath1 = path.join(artifactDir, "media__emulator_screenshot.png");
const outPngPath2 = path.join(artifactDir, "media_c3a09e3f-4072-4820-a4bb-b83205c5b5d7_scene2_test.png");

const mcp = new GeargrafxMCP(romPath);

(async () => {
  try {
    await mcp.start();
    console.log("Started MCP server...");

    for (let i = 0; i < 60; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    // Step 1: Walk right into Scene 1 Trigger 1 (X=232px)
    await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });
    for (let i = 0; i < 90; i++) {
      await mcp.callTool("debug_step_frame", {});
    }
    await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });

    for (let i = 0; i < 30; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    const res1 = await mcp.callTool("get_screenshot", {});
    fs.writeFileSync(outPngPath1, Buffer.from(res1.content[0].data, "base64"));
    console.log("Saved Scene 2 transition screenshot to:", outPngPath1);

    // Step 2: Walk left into Scene 2 Trigger 2 (X=0px)
    await mcp.callTool("controller_button", { player: 1, button: "left", action: "press" });
    for (let i = 0; i < 60; i++) {
      await mcp.callTool("debug_step_frame", {});
    }
    await mcp.callTool("controller_button", { player: 1, button: "left", action: "release" });

    for (let i = 0; i < 30; i++) {
      await mcp.callTool("debug_step_frame", {});
    }

    const res2 = await mcp.callTool("get_screenshot", {});
    fs.writeFileSync(outPngPath2, Buffer.from(res2.content[0].data, "base64"));
    console.log("Saved Scene 1 return transition screenshot to:", outPngPath2);

    mcp.stop();
  } catch (err) {
    console.error("Error:", err);
    mcp.stop();
  }
})();
