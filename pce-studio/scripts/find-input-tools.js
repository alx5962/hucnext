const GeargrafxMCP = require("./geargrafx-mcp-client");

const mcp = new GeargrafxMCP();
(async () => {
  await mcp.start();
  const toolsRes = await mcp.call("tools/list");
  const inputTools = toolsRes.tools.filter(t => t.name.includes("input") || t.name.includes("button") || t.name.includes("joy") || t.name.includes("key"));
  console.log("Input tools found:", JSON.stringify(inputTools, null, 2));
  mcp.stop();
})();
