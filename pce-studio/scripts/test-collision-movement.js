const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const geargrafxExe = "C:\\Emulators\\Geargrafx-1.7.16-desktop-windows-x64\\Geargrafx.exe";
const romPath = path.resolve(__dirname, "../build_tmp/main.pce");
const artifactScreenshot = "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\c3a09e3f-4072-4820-a4bb-b83205c5b5d7\\media__emulator_screenshot.png";

async function testCollision() {
  console.log("Launching Geargrafx MCP server to test collision stopping...");

  const child = spawn(geargrafxExe, ["--headless", "--mcp-stdio", romPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let idCounter = 1;
  function sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const reqId = idCounter++;
      const reqStr = JSON.stringify({ jsonrpc: "2.0", id: reqId, method, params }) + "\n";

      function onData(data) {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.id === reqId) {
              child.stdout.removeListener("data", onData);
              if (parsed.error) return reject(parsed.error);
              return resolve(parsed.result);
            }
          } catch (e) {}
        }
      }

      child.stdout.on("data", onData);
      child.stdin.write(reqStr);
    });
  }

  // Initialize MCP session
  await sendRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-collision", version: "1.0.0" }
  });

  // Step 60 frames to settle
  await sendRequest("tools/call", { name: "step_frames", arguments: { count: 60 } });

  // Press UP key (P1_UP) for 30 frames to walk up towards top wall
  await sendRequest("tools/call", { name: "press_buttons", arguments: { buttons: ["P1_UP"], duration: 30 } });

  // Step 20 frames
  await sendRequest("tools/call", { name: "step_frames", arguments: { count: 20 } });

  // Take screenshot
  const result = await sendRequest("tools/call", { name: "take_screenshot", arguments: {} });
  if (result && result.content && result.content[0] && result.content[0].data) {
    const base64Data = result.content[0].data;
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(artifactScreenshot, buffer);
    console.log("Saved emulator collision test screenshot to: " + artifactScreenshot);
  }

  child.kill();
}

testCollision().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
