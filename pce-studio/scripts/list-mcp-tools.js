const { spawn } = require("child_process");
const path = require("path");

const geargrafxExe = "C:\\Emulators\\Geargrafx-1.7.16-desktop-windows-x64\\Geargrafx.exe";
const romPath = path.resolve(__dirname, "../build_tmp/main.pce");

async function listTools() {
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

  await sendRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-collision", version: "1.0.0" }
  });

  const tools = await sendRequest("tools/list", {});
  console.log("MCP Tools:", JSON.stringify(tools, null, 2));

  child.kill();
}

listTools();
