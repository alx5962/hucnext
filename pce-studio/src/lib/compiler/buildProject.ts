import fs from "fs-extra";
import Path from "path";
import compileData from "./compileData";
import ejectBuild from "./ejectBuild";
import makeBuild from "./makeBuild";
import { loadEngineSchema } from "lib/project/loadEngineSchema";
import loadAllScriptEventHandlers from "lib/project/loadScriptEventHandlers";
import { globSync } from "lib/helpers/glob";
import { convertPngToPcx } from "./convertPngToPcx";
import { convertToIndexedPng } from "./convertToIndexedPng";

export type BuildProjectOptions = {
  projectRoot: string;
  outputRoot: string;
  romFilename: string;
  tmpPath?: string;
  buildType?: string;
  engineSchema?: any;
  debugEnabled?: boolean;
  useCustomWebTemplate?: boolean;
  make?: boolean;
  progress?: (msg: string) => void;
  warnings?: (msg: string) => void;
};

let cancelling = false;

export const buildProject = async (
  projectData: any,
  {
    projectRoot,
    outputRoot,
    romFilename = "game.pce",
    engineSchema,
    progress = () => {},
    warnings = () => {},
  }: BuildProjectOptions
) => {
  cancelling = false;
  progress("Starting PCE Studio build pipeline...");

  const loadedEngineSchema = engineSchema || (await loadEngineSchema(projectRoot));
  const scriptEventHandlers = await loadAllScriptEventHandlers(projectRoot);

  // Clean output directory for fresh build
  await fs.remove(outputRoot);
  await fs.ensureDir(outputRoot);

  await ejectBuild({
    outputRoot,
    progress,
  });

  // Copy project assets (backgrounds, sprites) into outputRoot
  const projectAssetsDir = Path.join(projectRoot, "assets");
  const outputAssetsDir = Path.join(outputRoot, "assets");
  if (await fs.pathExists(projectAssetsDir)) {
    await fs.copy(projectAssetsDir, outputAssetsDir, { overwrite: true });
  }

  const compiledData = await compileData(projectData, {
    projectRoot,
    engineSchema: loadedEngineSchema,
    scriptEventHandlers,
    tmpPath: outputRoot,
    progress,
    warnings,
  });

  // Write all compiled data files (scenes, tilemaps, tilesets, palettes, scripts) to outputRoot
  progress("Writing compiled game assets and data files...");
  const cFileIncludes: string[] = [];

  for (const [filename, fileContent] of Object.entries(compiledData.files)) {
    if (typeof fileContent === "string") {
      const targetPath = Path.join(outputRoot, filename);
      await fs.ensureDir(Path.dirname(targetPath));

      // Global regex replacements for HuC Small C dialect compatibility
      const sanitizedContent = fileContent
        .replace(/#pragma bank.*/g, "")
        .replace(/BANKREF\(.*\);?/g, "")
        .replace(/#include "gbs_types\.h"/g, '#include "include/gbs_types.h"')
        .replace(/\bstatic\s+/g, "")
        .replace(/\bUBYTE\b/g, "unsigned char")
        .replace(/\bUWORD\b/g, "unsigned int")
        .replace(/extern const /g, "const ");

      await fs.writeFile(targetPath, sanitizedContent, "utf8");

      // Only include raw root-level asset .c files compatible with Small C (e.g. scene_1_collisions.c)
      const baseName = Path.basename(filename);
      const isSubDir = filename.includes("/") || filename.includes("\\");
      if (
        filename.endsWith(".c") &&
        !isSubDir &&
        baseName !== "main.c" &&
        !baseName.startsWith("font_") &&
        !baseName.includes("signature") &&
        !fileContent.includes("struct ") &&
        !fileContent.includes("far_ptr_t") &&
        (!baseName.startsWith("scene_") || baseName.endsWith("_collisions.c"))
      ) {
        cFileIncludes.push(`#include "${baseName}"`);
      }
    }
  }

  // Detect project background and player sprite images and update main.c top level with HuC directives
  progress("Generating HuC PC Engine graphic image assets...");
  const bgFiles = globSync("**/*.png", { cwd: Path.join(outputAssetsDir, "backgrounds"), absolute: false });
  const spritePngFiles = globSync("**/*.png", { cwd: Path.join(outputAssetsDir, "sprites"), absolute: false });

  // Resolve Scene 1 & Scene 2 background images directly from projectData
  const scene1Obj = projectData?.scenes?.[0];
  const scene2Obj = projectData?.scenes?.[1];

  let bg1Filename = "scene.png";
  let bg2Filename = "scene2.png";

  if (scene1Obj?.backgroundId && projectData.backgrounds) {
    const bgObj = projectData.backgrounds.find((b: any) => b.id === scene1Obj.backgroundId);
    if (bgObj?.filename) bg1Filename = bgObj.filename;
  }

  if (scene2Obj?.backgroundId && projectData.backgrounds) {
    const bgObj = projectData.backgrounds.find((b: any) => b.id === scene2Obj.backgroundId);
    if (bgObj?.filename) bg2Filename = bgObj.filename;
  }

  const bg1Src = Path.join(outputAssetsDir, "backgrounds", bg1Filename);
  const bg2Src = Path.join(outputAssetsDir, "backgrounds", bg2Filename);

  // Convert background PNGs to 8-bit 16-color indexed format for HuC pceas compatibility
  try {
    convertToIndexedPng(bg1Src, bg1Src);
  } catch (e) {
    console.error("Error converting bg1 to indexed PNG:", e);
  }

  try {
    convertToIndexedPng(bg2Src, bg2Src);
  } catch (e) {
    console.error("Error converting bg2 to indexed PNG:", e);
  }

  const bg1Rel = `assets/backgrounds/${bg1Filename.replace(/\\/g, "/")}`;
  const bg2Rel = `assets/backgrounds/${bg2Filename.replace(/\\/g, "/")}`;

  let bgDirectives = `#incchr(bg_scene1_chr, "${bg1Rel}")\n#incpal(bg_scene1_pal, "${bg1Rel}")\n#incbat(bg_scene1_bat, "${bg1Rel}", 0x1000, 32, 28)\n`;
  let hasScene2Define = "";

  if (await fs.pathExists(bg2Src)) {
    bgDirectives += `#incchr(bg_scene2_chr, "${bg2Rel}")\n#incpal(bg_scene2_pal, "${bg2Rel}")\n#incbat(bg_scene2_bat, "${bg2Rel}", 0x1000, 32, 28)\n`;
    hasScene2Define = "#define HAS_SCENE_2 1\n";
  }

  // Resolve player sprite filename from project settings or fallback to iso_hero.png
  let playerSpriteFilename = "";
  let playerSpriteId =
    projectData?.settings?.playerSpriteSheetId ||
    projectData?.settings?.defaultPlayerSprites?.TOPDOWN ||
    projectData?.settings?.defaultPlayerSprites?.PLATFORM;

  if (playerSpriteId && projectData.sprites) {
    const foundSprite = projectData.sprites.find((s: any) => s.id === playerSpriteId);
    if (foundSprite && foundSprite.filename) {
      playerSpriteFilename = foundSprite.filename;
    }
  }

  if (!playerSpriteFilename && spritePngFiles.length > 0) {
    const isoHeroMatch = spritePngFiles.find(f => f.includes("iso_hero"));
    if (isoHeroMatch) {
      playerSpriteFilename = isoHeroMatch;
    } else {
      const sprMatch = spritePngFiles.find(f => !f.includes("static") && !f.includes("actor")) || spritePngFiles[0];
      playerSpriteFilename = sprMatch;
    }
  }

  let playerPcxRelativePath = "assets/sprites/iso_hero.pcx";
  let playerSprWidth16 = 1;
  let playerSprHeight16 = 1;

  if (playerSpriteFilename) {
    const srcPng = Path.join(outputAssetsDir, "sprites", playerSpriteFilename);
    const destPcx = srcPng.replace(/\.png$/i, ".pcx");
    try {
      const dims = convertPngToPcx(srcPng, destPcx);
      playerSprWidth16 = Math.max(1, Math.min(2, Math.floor(dims.width / 16)));
      playerSprHeight16 = Math.max(1, Math.min(2, Math.floor(dims.height / 16)));
      playerPcxRelativePath = `assets/sprites/${Path.relative(Path.join(outputAssetsDir, "sprites"), destPcx).replace(/\\/g, "/")}`;
    } catch (e) {
      console.error("Error converting player sprite PNG to PCX:", e);
    }
  }

  // Resolve player start position
  const playerStartX = (projectData?.settings?.startX ?? 13) * 8;
  const playerStartY = (projectData?.settings?.startY ?? 14) * 8;

  // Resolve scene 1 & scene 2 actors
  let actor1Directives = "";
  let actorDefines = "";

  const scene1Actors = projectData?.scenes?.[0]?.actors || [];
  const scene2Actors = projectData?.scenes?.[1]?.actors || [];

  let firstActorFilename = "actor.png";
  if (scene1Actors[0]?.spriteSheetId && projectData.sprites) {
    const spr = projectData.sprites.find((s: any) => s.id === scene1Actors[0].spriteSheetId);
    if (spr?.filename) firstActorFilename = spr.filename;
  } else if (scene2Actors[0]?.spriteSheetId && projectData.sprites) {
    const spr = projectData.sprites.find((s: any) => s.id === scene2Actors[0].spriteSheetId);
    if (spr?.filename) firstActorFilename = spr.filename;
  }

  const actor1SrcPng = Path.join(outputAssetsDir, "sprites", firstActorFilename);
  const actor1DestPcx = actor1SrcPng.replace(/\.png$/i, ".pcx");
  try {
    const dims = convertPngToPcx(actor1SrcPng, actor1DestPcx);
    const w16 = Math.max(1, Math.min(2, Math.floor(dims.width / 16)));
    const h16 = Math.max(1, Math.min(2, Math.floor(dims.height / 16)));
    const relPcx = `assets/sprites/${Path.relative(Path.join(outputAssetsDir, "sprites"), actor1DestPcx).replace(/\\/g, "/")}`;

    actor1Directives = `#incspr(actor1_spr, "${relPcx}", 0, 0, ${w16}, ${h16})\n#incpal(actor1_pal, "${relPcx}")\n`;
    actorDefines += `#define HAS_ACTOR_1 1\n#define ACTOR_1_X ${((scene1Actors[0]?.x ?? scene2Actors[0]?.x ?? 14) * 8)}\n#define ACTOR_1_Y ${((scene1Actors[0]?.y ?? scene2Actors[0]?.y ?? 5) * 8)}\n`;
  } catch (e) {
    console.error("Error converting scene actor 1 PNG to PCX:", e);
  }

  if (scene1Actors.length > 0) {
    actorDefines += `#define HAS_ACTOR_SCENE_1 1\n#define ACTOR_SCENE_1_X ${(scene1Actors[0].x ?? 14) * 8}\n#define ACTOR_SCENE_1_Y ${(scene1Actors[0].y ?? 5) * 8}\n`;
  }
  if (scene2Actors.length > 0) {
    actorDefines += `#define HAS_ACTOR_SCENE_2 1\n#define ACTOR_SCENE_2_X ${(scene2Actors[0].x ?? 5) * 8}\n#define ACTOR_SCENE_2_Y ${(scene2Actors[0].y ?? 5) * 8}\n`;
  }

  // Map scenes and triggers for multi-scene transition
  let triggerDefines = "";
  const scenes = projectData?.scenes || [];
  let globalTriggerCount = 0;

  scenes.forEach((sc: any, scIdx: number) => {
    const sceneNum = scIdx + 1; // 1-indexed
    (sc.triggers || []).forEach((trig: any) => {
      globalTriggerCount++;
      const trigX = trig.x ?? 0;
      const trigY = trig.y ?? 0;
      const trigW = trig.width ?? 1;
      const trigH = trig.height ?? 1;

      let targetSceneNum = sceneNum === 1 ? 2 : 1;
      let targetX = 72;
      let targetY = 80;

      if (trig.script && Array.isArray(trig.script)) {
        const switchEvt = trig.script.find((e: any) => e.command === "EVENT_SWITCH_SCENE");
        if (switchEvt && switchEvt.args) {
          const targetSceneId = switchEvt.args.sceneId;
          const targetSceneIdx = scenes.findIndex((s: any) => s.id === targetSceneId);
          if (targetSceneIdx >= 0) {
            targetSceneNum = targetSceneIdx + 1;
          }

          if (typeof switchEvt.args.x === "number") targetX = switchEvt.args.x * 8;
          else if (switchEvt.args.x?.value) targetX = Number(switchEvt.args.x.value) * 8;

          if (typeof switchEvt.args.y === "number") targetY = switchEvt.args.y * 8;
          else if (switchEvt.args.y?.value) targetY = Number(switchEvt.args.y.value) * 8;
        }
      }

      triggerDefines += `#define HAS_TRIGGER_${globalTriggerCount} 1\n#define TRIGGER_${globalTriggerCount}_SCENE ${sceneNum}\n#define TRIGGER_${globalTriggerCount}_X ${trigX}\n#define TRIGGER_${globalTriggerCount}_Y ${trigY}\n#define TRIGGER_${globalTriggerCount}_W ${trigW}\n#define TRIGGER_${globalTriggerCount}_H ${trigH}\n#define TRIGGER_${globalTriggerCount}_TARGET_SCENE ${targetSceneNum}\n#define TRIGGER_${globalTriggerCount}_TARGET_X ${targetX}\n#define TRIGGER_${globalTriggerCount}_TARGET_Y ${targetY}\n`;
    });
  });

  const mainCPath = Path.join(outputRoot, "main.c");
  let mainCContent = `/*\n * PCE Studio Engine Main Entry Point\n * Compiled with HuC (PC Engine C Compiler)\n */\n\n#include <huc.h>\n\n${bgDirectives}\n#incspr(player_spr, "${playerPcxRelativePath}", 0, 0, ${playerSprWidth16}, ${playerSprHeight16})\n#incpal(player_pal, "${playerPcxRelativePath}")\n\n${actor1Directives}\n#define PLAYER_START_X ${playerStartX}\n#define PLAYER_START_Y ${playerStartY}\n${hasScene2Define}${actorDefines}\n${triggerDefines}\n#ifndef MAIN_C\n#define MAIN_C\n\n#include "include/engine.h"\n#include "src/pce_system.c"\n#include "src/actor.c"\n#include "src/camera.c"\n#include "src/collision.c"\n#include "src/trigger.c"\n#include "src/vm.c"\n#include "src/engine.c"\n#include "game_includes.h"\n\nmain() {\n    engine_run();\n}\n\n#endif\n`;
  await fs.writeFile(mainCPath, mainCContent, "utf8");

  // Create game_includes.h in outputRoot
  const gameIncludesContent = `/* Auto-generated PCE Studio Game Data Includes */\n#ifndef GAME_INCLUDES_H\n#define GAME_INCLUDES_H\n\n#include "include/gbs_types.h"\n\n${cFileIncludes.join("\n")}\n\n#endif\n`;
  await fs.writeFile(Path.join(outputRoot, "game_includes.h"), gameIncludesContent, "utf8");

  const romPath = await makeBuild({
    buildRoot: outputRoot,
    romFilename,
    tmpPath: outputRoot,
    progress,
    warnings,
  });

  progress(`Build complete! ROM available at: ${romPath}`);
  return compiledData;
};

export const cancelCompileStepsInProgress = () => {
  cancelling = true;
};

export default buildProject;
