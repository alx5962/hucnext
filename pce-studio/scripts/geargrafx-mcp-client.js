const { spawn } = require("child_process");
const path = require("path");

class GeargrafxMCP {
  constructor(romPath) {
    this.romPath = romPath || path.resolve(__dirname, "../build_tmp/main.pce");
    this.geargrafxExe = "C:\\Emulators\\Geargrafx-1.7.16-desktop-windows-x64\\Geargrafx.exe";
    this.child = null;
    this.idCounter = 1;
    this.pending = new Map();
    this.buffer = "";
  }

  start() {
    return new Promise((resolve, reject) => {
      this.child = spawn(this.geargrafxExe, ["--headless", "--mcp-stdio", this.romPath]);

      this.child.stdout.on("data", (data) => {
        this.buffer += data.toString();
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.id && this.pending.has(json.id)) {
              const { resolve: res, reject: rej } = this.pending.get(json.id);
              this.pending.delete(json.id);
              if (json.error) {
                rej(json.error);
              } else {
                res(json.result);
              }
            }
          } catch (err) {
            // non-json output ignore
          }
        }
      });

      this.child.stderr.on("data", (data) => {
        // console.warn("Geargrafx stderr:", data.toString());
      });

      this.child.on("error", (err) => reject(err));

      // Send initialize
      this.call("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "PCE-Studio-Debug", version: "1.0.0" }
      }).then((res) => {
        resolve(res);
      }).catch(reject);
    });
  }

  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.idCounter++;
      this.pending.set(id, { resolve, reject });
      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      this.child.stdin.write(msg);
    });
  }

  callTool(name, args = {}) {
    return this.call("tools/call", { name, arguments: args });
  }

  stop() {
    if (this.child) {
      this.child.kill();
    }
  }
}

module.exports = GeargrafxMCP;

// CLI usage if executed directly
if (require.main === module) {
  const romArg = process.argv[2];
  const mcp = new GeargrafxMCP(romArg);
  (async () => {
    try {
      console.log("Initializing Geargrafx MCP...");
      await mcp.start();
      console.log("MCP initialized.");

      const tools = await mcp.call("tools/list");
      console.log(`Available Tools count: ${tools.tools.length}`);

      // Get trace log or execution status
      const trace = await mcp.callTool("get_trace_log", { count: 10 });
      console.log("Trace log:", JSON.stringify(trace, null, 2));

      mcp.stop();
    } catch (err) {
      console.error("Error:", err);
      mcp.stop();
    }
  })();
}
