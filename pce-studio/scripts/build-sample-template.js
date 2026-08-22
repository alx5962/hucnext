const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const projDir = "C:\\workspace\\git\\hucnext\\pce-studio\\appData\\templates\\gbhtml";
const buildDir = path.resolve(__dirname, "../build_tmp");

const code = `
import { buildProject } from "../src/lib/compiler/buildProject";
import path from "path";
import fs from "fs-extra";
import { execSync } from "child_process";

async function main() {
  const projDir = ${JSON.stringify(projDir)};
  const buildDir = ${JSON.stringify(buildDir)};
  console.log("=== Building GBHTML Template Project ===");
  await buildProject(projDir, buildDir);

  const hucExe = path.resolve(__dirname, "../../bin/huc.exe");
  const pceasExe = path.resolve(__dirname, "../../bin/pceas.exe");
  const rawIncludeDir = path.resolve(__dirname, "../../include/huc");
  const includeDir = path.relative(buildDir, rawIncludeDir).replace(/\\\\/g, "/");

  console.log("Running HuC compiler on generated main.c...");
  try {
    execSync(\`"\${hucExe}" main.c\`, { cwd: buildDir, stdio: "inherit", env: { ...process.env, PCE_INCLUDE: includeDir } });
  } catch (e) {
    if (!fs.existsSync(path.join(buildDir, "main.s"))) {
      throw e;
    }
  }

  execSync(\`"\${pceasExe}" -raw main.s\`, { cwd: buildDir, stdio: "inherit", env: { ...process.env, PCE_INCLUDE: includeDir } });
  console.log("SUCCESS! Generated PC Engine ROM:", path.join(buildDir, "main.pce"));
}
main().catch(err => { console.error(err); process.exit(1); });
`;

fs.writeFileSync(path.resolve(__dirname, "temp-runner.ts"), code, "utf8");
try {
  execSync(`npx ts-node --transpileOnly -r tsconfig-paths/register -O "{\\"module\\":\\"commonjs\\",\\"moduleResolution\\":\\"node\\"}" scripts/temp-runner.ts`, {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit"
  });
} finally {
  try { fs.unlinkSync(path.resolve(__dirname, "temp-runner.ts")); } catch (e) { }
}
