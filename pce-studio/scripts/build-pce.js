const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { convertPngToPcx } = require("./convert-png-to-pcx");

async function runTestBuild() {
  console.log("=== PCE Studio Test Build Runner ===");
  
  const hucExe = path.resolve(__dirname, "../../bin/huc.exe");
  const pceasExe = path.resolve(__dirname, "../../bin/pceas.exe");
  const buildDir = path.resolve(__dirname, "../build_tmp");
  const engineDir = path.resolve(__dirname, "../appData/engine/pcevm");
  const rawIncludeDir = path.resolve(__dirname, "../../include/huc");

  // Compute relative path from buildDir to rawIncludeDir using forward slashes
  let includeDir = path.relative(buildDir, rawIncludeDir).replace(/\\/g, "/");

  console.log(`HuC Exe: ${hucExe}`);
  console.log(`PCEAS Exe: ${pceasExe}`);
  console.log(`Include Dir (relative): ${includeDir}`);

  if (!fs.existsSync(hucExe) || !fs.existsSync(pceasExe)) {
    console.error("Error: HuC toolchain missing in bin/");
    process.exit(1);
  }

  console.log(`Copying engine from ${engineDir} to ${buildDir}...`);
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });
  fs.cpSync(engineDir, buildDir, { recursive: true });

  // Copy sample background & iso_hero sprite image for test build
  const shmupDir = path.resolve(__dirname, "../../examples/huc/shmup");
  const isoHeroPng = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\iso_hero.png";
  const destBgDir = path.join(buildDir, "assets/backgrounds");
  const destSprDir = path.join(buildDir, "assets/sprites");
  fs.mkdirSync(destBgDir, { recursive: true });
  fs.mkdirSync(destSprDir, { recursive: true });

  if (fs.existsSync(path.join(shmupDir, "scene.png"))) {
    fs.copyFileSync(path.join(shmupDir, "scene.png"), path.join(destBgDir, "scene.png"));
  }
  if (fs.existsSync(isoHeroPng)) {
    convertPngToPcx(isoHeroPng, path.join(destSprDir, "iso_hero.pcx"));
  }

  // Update main.c for test build
  const mainCPath = path.join(buildDir, "main.c");
  const mainCContent = `/*
 * PCE Studio Engine Main Entry Point
 * Compiled with HuC (PC Engine C Compiler)
 */

#include <huc.h>

#incchr(bg_scene_chr, "assets/backgrounds/scene.png")
#incpal(bg_scene_pal, "assets/backgrounds/scene.png")
#incbat(bg_scene_bat, "assets/backgrounds/scene.png", 0x1000, 32, 28)

#incspr(player_spr, "assets/sprites/iso_hero.pcx", 0, 0, 4, 1)
#incpal(player_pal, "assets/sprites/iso_hero.pcx")

#ifndef MAIN_C
#define MAIN_C

#include "include/engine.h"
#include "src/pce_system.c"
#include "src/actor.c"
#include "src/camera.c"
#include "src/collision.c"
#include "src/trigger.c"
#include "src/vm.c"
#include "src/engine.c"
#include "game_includes.h"

main() {
    engine_run();
}

#endif
`;
  fs.writeFileSync(mainCPath, mainCContent, "utf8");

  console.log("Executing HuC compilation...");
  const env = {
    ...process.env,
    PCE_INCLUDE: includeDir,
    PCE_PCEAS: pceasExe,
  };

  try {
    const cmd = `"${hucExe}" main.c`;
    console.log(`Command: ${cmd}`);
    const output = execSync(cmd, { cwd: buildDir, env, encoding: "utf8" });
    console.log("Compiler Output:\n" + output);

    const generatedPce = path.join(buildDir, "main.pce");
    if (fs.existsSync(generatedPce)) {
      const stats = fs.statSync(generatedPce);
      console.log(`====================================================`);
      console.log(`SUCCESS! Generated PC Engine ROM: ${generatedPce} (${stats.size} bytes)`);
      console.log(`====================================================`);
    } else {
      console.error("ERROR: main.pce was not generated.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Compilation failed:", err.message);
    if (err.stdout) console.log("STDOUT:", err.stdout);
    if (err.stderr) console.log("STDERR:", err.stderr);
    process.exit(1);
  }
}

runTestBuild();
