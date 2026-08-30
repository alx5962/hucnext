const fs = require("fs");
const path = require("path");
const { buildProject } = require("../src/lib/compiler/buildProject");
const { execSync } = require("child_process");
const GeargrafxMCP = require("./geargrafx-mcp-client");

async function main() {
  const projDir = "C:\\Users\\alx59\\Documents\\PCEtest1";
  const buildDir = path.resolve(__dirname, "../build_tmp");

  console.log("Building project with 3 distinct visual parallax layers...");
  await buildProject(projDir, buildDir);

  const hucExe = path.resolve(__dirname, "../../bin/huc.exe");
  const pceasExe = path.resolve(__dirname, "../../bin/pceas.exe");
  const rawIncludeDir = path.resolve(__dirname, "../../include/huc");
  const includeDir = path.relative(buildDir, rawIncludeDir).replace(/\\/g, "/");

  execSync(`"${hucExe}" main.c`, { cwd: buildDir, stdio: "inherit", env: { ...process.env, PCE_INCLUDE: includeDir } });
  execSync(`"${pceasExe}" -raw main.s`, { cwd: buildDir, stdio: "inherit", env: { ...process.env, PCE_INCLUDE: includeDir } });

  console.log("Testing in emulator...");
  const romPath = path.join(buildDir, "main.pce");
  const mcp = new GeargrafxMCP(romPath);
  const artifactDir = "C:\\Users\\alx59\\.gemini\\antigravity-ide\\brain\\bcc1e76c-ef26-4ea4-83fa-ec9982ce3c8e";

  await mcp.start();
  for (let i = 0; i < 60; i++) await mcp.callTool("debug_step_frame", {});

  // Move right 150 frames
  await mcp.callTool("controller_button", { player: 1, button: "right", action: "press" });
  for (let i = 0; i < 150; i++) await mcp.callTool("debug_step_frame", {});

  const shot = await mcp.callTool("get_screenshot", {});
  if (shot?.content?.[0]?.data) {
    fs.writeFileSync(path.join(artifactDir, "parallax_visual_test.png"), Buffer.from(shot.content[0].data, "base64"));
    console.log("Saved parallax_visual_test.png");
  }

  await mcp.callTool("controller_button", { player: 1, button: "right", action: "release" });
  mcp.stop();
}

main().catch(err => { console.error(err); process.exit(1); });
