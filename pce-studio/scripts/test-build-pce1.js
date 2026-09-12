const path = require("path");
const fs = require("fs-extra");
const { execSync } = require("child_process");

const projDir = "C:\\Users\\alx59\\Documents\\PCEtest1";
const buildDir = "C:\\Users\\alx59\\Documents\\PCEtest1\\build";

const code = `
import { buildProject } from "../src/lib/compiler/buildProject";
import makeBuild from "../src/lib/compiler/makeBuild";
import path from "path";
import fs from "fs-extra";

async function run() {
  const projDir = ${JSON.stringify(projDir)};
  const buildDir = ${JSON.stringify(buildDir)};
  console.log("1. Running buildProject()...");
  const projData = await fs.readJson(path.join(projDir, "PCEtest1.gbsproj"));
  if (!projData.settings) projData.settings = {};
  projData.settings.targetSystem = "scd";
  await buildProject(projDir, buildDir);
  console.log("buildProject() complete!");

  console.log("2. Running makeBuild()...");
  await makeBuild({
    buildRoot: buildDir,
    romFilename: "game.iso",
    tmpPath: buildDir,
    data: projData,
    progress: (msg) => console.log("[PROGRESS]", msg),
    warnings: (msg) => console.warn("[WARN]", msg),
  });
  console.log("3. Build SUCCESSFUL!");
}

run().catch(err => {
  console.error("BUILD FAILED:", err);
  process.exit(1);
});
`;

fs.writeFileSync(path.resolve(__dirname, "temp-test-build.ts"), code, "utf8");
try {
  execSync(`npx ts-node --transpileOnly -r tsconfig-paths/register -O "{\\"module\\":\\"commonjs\\",\\"moduleResolution\\":\\"node\\"}" scripts/temp-test-build.ts`, {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit"
  });
} finally {
  try { fs.unlinkSync(path.resolve(__dirname, "temp-test-build.ts")); } catch (e) { }
}
