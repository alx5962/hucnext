const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { convertPngToPcx } = require("./convert-png-to-pcx");
const { convertToIndexedPng } = require("./indexed-png-writer");

async function runTestBuild() {
  console.log("=== PCE Studio Test Build Runner ===");
  
  const hucExe = path.resolve(__dirname, "../../bin/huc.exe");
  const pceasExe = path.resolve(__dirname, "../../bin/pceas.exe");
  const buildDir = path.resolve(__dirname, "../build_tmp");
  const engineDir = path.resolve(__dirname, "../appData/engine/pcevm");
  const rawIncludeDir = path.resolve(__dirname, "../../include/huc");

  let includeDir = path.relative(buildDir, rawIncludeDir).replace(/\\/g, "/");

  if (!fs.existsSync(hucExe) || !fs.existsSync(pceasExe)) {
    console.error("Error: HuC toolchain missing in bin/");
    process.exit(1);
  }

  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });
  fs.cpSync(engineDir, buildDir, { recursive: true });

  const shmupDir = path.resolve(__dirname, "../../examples/huc/shmup");
  const isoHeroPng = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\iso_hero.png";
  const actorPng = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\sprites\\actor.png";
  const scene2Png = "C:\\Users\\alx59\\Documents\\PCEtest1\\assets\\backgrounds\\scene2.png";

  const destBgDir = path.join(buildDir, "assets/backgrounds");
  const destSprDir = path.join(buildDir, "assets/sprites");
  fs.mkdirSync(destBgDir, { recursive: true });
  fs.mkdirSync(destSprDir, { recursive: true });

  if (fs.existsSync(path.join(shmupDir, "scene.png"))) {
    fs.copyFileSync(path.join(shmupDir, "scene.png"), path.join(destBgDir, "scene.png"));
  }
  if (fs.existsSync(scene2Png)) {
    convertToIndexedPng(scene2Png, path.join(destBgDir, "scene2.png"));
  }
  if (fs.existsSync(isoHeroPng)) {
    convertPngToPcx(isoHeroPng, path.join(destSprDir, "iso_hero.pcx"));
  }
  if (fs.existsSync(actorPng)) {
    convertPngToPcx(actorPng, path.join(destSprDir, "actor.pcx"));
  }

  // Scene 1 & Scene 2 collisions
  const collisions1 = new Array(32 * 28).fill(0);
  for (let x = 0; x < 32; x++) {
    collisions1[3 * 32 + x] = 15;
    collisions1[18 * 32 + x] = 15;
  }
  const lines1 = [];
  for (let i = 0; i < collisions1.length; i += 16) {
    const chunk = collisions1.slice(i, i + 16).map(c => `0x${c.toString(16).padStart(2, "0").toUpperCase()}`);
    lines1.push(`  ${chunk.join(", ")}`);
  }
  const sc1CContent = `#include "include/gbs_types.h"\n\nconst unsigned char scene_1_collisions[] = {\n${lines1.join(",\n")}\n};\n`;
  fs.writeFileSync(path.join(buildDir, "scene_1_collisions.c"), sc1CContent, "utf8");

  const collisions2 = new Array(32 * 28).fill(0);
  for (let x = 0; x < 32; x++) {
    collisions2[2 * 32 + x] = 15;
    collisions2[20 * 32 + x] = 15;
  }
  const lines2 = [];
  for (let i = 0; i < collisions2.length; i += 16) {
    const chunk = collisions2.slice(i, i + 16).map(c => `0x${c.toString(16).padStart(2, "0").toUpperCase()}`);
    lines2.push(`  ${chunk.join(", ")}`);
  }
  const sc2CContent = `#include "include/gbs_types.h"\n\nconst unsigned char scene_2_collisions[] = {\n${lines2.join(",\n")}\n};\n`;
  fs.writeFileSync(path.join(buildDir, "scene_2_collisions.c"), sc2CContent, "utf8");

  fs.writeFileSync(path.join(buildDir, "game_includes.h"), `#ifndef GAME_INCLUDES_H\n#define GAME_INCLUDES_H\n#include "include/gbs_types.h"\n#include "scene_1_collisions.c"\n#include "scene_2_collisions.c"\n#endif\n`, "utf8");

  const mainCPath = path.join(buildDir, "main.c");
  const mainCContent = `/*
 * PCE Studio Engine Main Entry Point
 * Compiled with HuC (PC Engine C Compiler)
 */

#include <huc.h>

#incchr(bg_scene1_chr, "assets/backgrounds/scene.png")
#incpal(bg_scene1_pal, "assets/backgrounds/scene.png")
#incbat(bg_scene1_bat, "assets/backgrounds/scene.png", 0x1000, 32, 28)

#incchr(bg_scene2_chr, "assets/backgrounds/scene2.png")
#incpal(bg_scene2_pal, "assets/backgrounds/scene2.png")
#incbat(bg_scene2_bat, "assets/backgrounds/scene2.png", 0x1000, 32, 28)

#incspr(player_spr, "assets/sprites/iso_hero.pcx", 0, 0, 4, 1)
#incpal(player_pal, "assets/sprites/iso_hero.pcx")

#incspr(actor1_spr, "assets/sprites/actor.pcx", 0, 0, 2, 1)
#incpal(actor1_pal, "assets/sprites/actor.pcx")

#define PLAYER_START_X 104
#define PLAYER_START_Y 112
#define HAS_SCENE_2 1
#define HAS_ACTOR_1 1
#define ACTOR_1_X 200
#define ACTOR_1_Y 32

#define HAS_ACTOR_SCENE_1 1
#define ACTOR_SCENE_1_X 200
#define ACTOR_SCENE_1_Y 32

#define HAS_ACTOR_SCENE_2 1
#define ACTOR_SCENE_2_X 40
#define ACTOR_SCENE_2_Y 40

#define HAS_TRIGGER_1 1
#define TRIGGER_1_SCENE 1
#define TRIGGER_1_X 29
#define TRIGGER_1_Y 2
#define TRIGGER_1_W 3
#define TRIGGER_1_H 14
#define TRIGGER_1_TARGET_SCENE 2
#define TRIGGER_1_TARGET_X 72
#define TRIGGER_1_TARGET_Y 80

#define HAS_TRIGGER_2 1
#define TRIGGER_2_SCENE 2
#define TRIGGER_2_X 0
#define TRIGGER_2_Y 2
#define TRIGGER_2_W 3
#define TRIGGER_2_H 14
#define TRIGGER_2_TARGET_SCENE 1
#define TRIGGER_2_TARGET_X 160
#define TRIGGER_2_TARGET_Y 56

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

  const env = {
    ...process.env,
    PCE_INCLUDE: includeDir,
    PCE_PCEAS: pceasExe,
  };

  try {
    const cmd = `"${hucExe}" main.c`;
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
