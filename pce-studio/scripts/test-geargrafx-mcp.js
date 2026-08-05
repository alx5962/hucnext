const { spawn } = require("child_process");

const geargrafxExe = "C:\\Emulators\\Geargrafx-1.7.16-desktop-windows-x64\\Geargrafx.exe";
const romPath = "C:\\workspace\\git\\hucnext\\pce-studio\\build_tmp\\main.pce";

const child = spawn(geargrafxExe, ["--headless", "--mcp-stdio", romPath]);

child.stdout.on("data", (data) => {
  const lines = data.toString().split("\n");
  for (const l of lines) {
    if (l.trim()) {
      try {
        const json = JSON.parse(l);
        console.log("MCP RESPONSE:", JSON.stringify(json, null, 2));
      } catch {
        console.log("STDOUT:", l);
      }
    }
  }
});

child.stderr.on("data", (data) => {
  console.log("STDERR:", data.toString());
});

const initReq = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "PCE-Studio-Agent", version: "1.0.0" }
  }
};

child.stdin.write(JSON.stringify(initReq) + "\n");

setTimeout(() => {
  const toolsReq = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };
  child.stdin.write(JSON.stringify(toolsReq) + "\n");
}, 500);

setTimeout(() => {
  child.kill();
}, 3000);
