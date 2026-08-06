import fs from "fs-extra";
import Path from "path";
import convertPngToPcxDefault, { convertPngToPcx as convertPngToPcxFn } from "./convertPngToPcx";
import convertToIndexedPngDefault, { convertToIndexedPng as convertToIndexedPngFn } from "./indexedPngWriter";

const pathModule = (Path as any).default || Path;
const convertPngToPcx = (convertPngToPcxDefault || convertPngToPcxFn) as typeof convertPngToPcxFn;
const convertToIndexedPng = (convertToIndexedPngDefault || convertToIndexedPngFn) as typeof convertToIndexedPngFn;

function getCropXForActor(actor: any, sprObj: any, canvasW: number): number {
  try {
    const firstTile = sprObj?.states?.[0]?.animations?.[0]?.frames?.[0]?.tiles?.[0];
    if (firstTile && typeof firstTile.sliceX === "number") {
      return firstTile.sliceX;
    }
  } catch (e) { }

  const dir = actor?.direction?.toLowerCase() || "down";
  if (dir === "up") return canvasW * 1;
  if (dir === "right") return canvasW * 2;
  if (dir === "left") return canvasW * 3;
  return 0;
}

export function cancelCompileStepsInProgress() {
  // Cancellation stub
}

export async function buildProject(projectDirPath: string | any, outputBuildDir: string | any) {
  let projDir = "";
  if (typeof projectDirPath === "string") {
    projDir = projectDirPath;
  } else if (projectDirPath?.path) {
    projDir = projectDirPath.path;
  } else if (outputBuildDir?.projectRoot) {
    projDir = outputBuildDir.projectRoot;
  } else {
    projDir = process.cwd();
  }

  let buildDir = "";
  if (typeof outputBuildDir === "string") {
    buildDir = outputBuildDir;
  } else if (outputBuildDir?.outputRoot) {
    buildDir = outputBuildDir.outputRoot;
  } else if (outputBuildDir?.buildRoot) {
    buildDir = outputBuildDir.buildRoot;
  } else if (projectDirPath?.outputRoot) {
    buildDir = projectDirPath.outputRoot;
  } else {
    buildDir = pathModule.join(projDir, "build_tmp");
  }

  await fs.ensureDir(buildDir);

  const { defaultEngineRoot } = require("../../consts");
  if (fs.existsSync(defaultEngineRoot)) {
    await fs.copy(defaultEngineRoot, buildDir, { overwrite: true });
  }

  // Look for project files (.gbsproj or project directory)
  const projectJsonPath = pathModule.join(projDir, "project.gbsproj");
  let projectData: any = {};
  if (fs.existsSync(projectJsonPath)) {
    projectData = await fs.readJson(projectJsonPath);
  }

  // Load settings.gbsres if present
  let settingsGbsData: any = {};
  const settingsGbsPath = pathModule.join(projDir, "project", "settings.gbsres");
  if (fs.existsSync(settingsGbsPath)) {
    try {
      settingsGbsData = fs.readJsonSync(settingsGbsPath);
    } catch (e) { }
  }

  // Load gbsres files if present
  const assetsDir = pathModule.join(projDir, "assets");
  const outputAssetsDir = pathModule.join(buildDir, "assets");
  if (fs.existsSync(assetsDir)) {
    await fs.copy(assetsDir, outputAssetsDir, { overwrite: true });
  }

  // Parse sprite gbsres files
  const spritesFromGbsres: any[] = [];
  const spritesDir = pathModule.join(assetsDir, "sprites");
  if (fs.existsSync(spritesDir)) {
    const gbsFiles = fs.readdirSync(spritesDir).filter(f => typeof f === "string" && f.endsWith(".gbsres"));
    for (const gf of gbsFiles) {
      try {
        const json = fs.readJsonSync(pathModule.join(spritesDir, gf));
        spritesFromGbsres.push(json);
      } catch (e) { }
    }
  }

  const allSprites = [...(projectData.sprites || []), ...spritesFromGbsres];

  // Parse scene and actor gbsres files
  const scenesFromGbsres: any[] = [];
  const scenesDir = pathModule.join(projDir, "project", "scenes");
  if (fs.existsSync(scenesDir)) {
    const sceneDirs = fs.readdirSync(scenesDir);
    for (const sd of sceneDirs) {
      const sceneGbs = pathModule.join(scenesDir, String(sd), "scene.gbsres");
      if (fs.existsSync(sceneGbs)) {
        try {
          const scJson = fs.readJsonSync(sceneGbs);
          scJson.actors = [];
          scJson.triggers = [];

          const actorsDir = pathModule.join(scenesDir, String(sd), "actors");
          if (fs.existsSync(actorsDir)) {
            const actFiles = fs.readdirSync(actorsDir).filter(f => typeof f === "string" && f.endsWith(".gbsres") && !f.endsWith(".bak"));
            for (const af of actFiles) {
              const actJson = fs.readJsonSync(pathModule.join(actorsDir, af));
              scJson.actors.push(actJson);
            }
          }

          const triggersDir = pathModule.join(scenesDir, String(sd), "triggers");
          if (fs.existsSync(triggersDir)) {
            const trigFiles = fs.readdirSync(triggersDir).filter(f => typeof f === "string" && f.endsWith(".gbsres") && !f.endsWith(".bak"));
            for (const tf of trigFiles) {
              const trJson = fs.readJsonSync(pathModule.join(triggersDir, tf));
              scJson.triggers.push(trJson);
            }
          }

          scenesFromGbsres.push(scJson);
        } catch (e) { }
      }
    }
  }

  const allScenes = scenesFromGbsres.length > 0 ? scenesFromGbsres : (projectData.scenes || []);

  // Look for background PNGs and map backgroundId -> filename
  const bgIdMap: Record<string, string> = {};
  const bgAssetsDir = pathModule.join(outputAssetsDir, "backgrounds");
  const projectBgDir = pathModule.join(projDir, "assets", "backgrounds");
  const bgDirsToScan = [projectBgDir, bgAssetsDir];

  for (const bDir of bgDirsToScan) {
    if (fs.existsSync(bDir)) {
      const gbsresFiles = fs.readdirSync(bDir).filter((f: any) => typeof f === "string" && f.endsWith(".gbsres"));
      for (const gbf of gbsresFiles) {
        try {
          const bJson = fs.readJsonSync(pathModule.join(bDir, gbf));
          if (bJson && bJson.id && bJson.filename) {
            bgIdMap[bJson.id] = bJson.filename;
          }
        } catch (e) { }
      }
    }
  }

  let scene1BgFilename = "scene.png";
  if (allScenes[0]?.backgroundId && bgIdMap[allScenes[0].backgroundId]) {
    scene1BgFilename = bgIdMap[allScenes[0].backgroundId];
  }

  let scene2BgFilename = "scene3.png";
  if (allScenes[1]?.backgroundId && bgIdMap[allScenes[1].backgroundId]) {
    scene2BgFilename = bgIdMap[allScenes[1].backgroundId];
  }

  // Ensure background PNGs exist in build assets/backgrounds directory
  const destBgDir = pathModule.join(buildDir, "assets", "backgrounds");
  await fs.ensureDir(destBgDir);



  for (const bgFile of [scene1BgFilename, scene2BgFilename]) {
    for (const bDir of bgDirsToScan) {
      const srcPng = pathModule.join(bDir, bgFile);
      if (fs.existsSync(srcPng)) {
        const destPng = pathModule.join(destBgDir, bgFile);
        try {
          convertToIndexedPng(srcPng, destPng);
        } catch (e) {
          await fs.copy(srcPng, destPng, { overwrite: true });
        }
        break;
      }
    }
  }

  // Look for sprite PNGs
  const spritePngFiles = fs.existsSync(pathModule.join(outputAssetsDir, "sprites"))
    ? fs.readdirSync(pathModule.join(outputAssetsDir, "sprites")).filter(f => typeof f === "string" && f.endsWith(".png"))
    : [];

  let playerSpriteFilename = "";
  if (projectData?.settings?.playerSpriteSheetId && allSprites.length > 0) {
    const sprObj = allSprites.find((s: any) => s.id === projectData.settings.playerSpriteSheetId);
    if (sprObj?.filename) {
      playerSpriteFilename = String(sprObj.filename);
    }
  }

  if (!playerSpriteFilename && spritePngFiles.length > 0) {
    const isoHeroMatch = spritePngFiles.find(f => String(f).includes("iso_hero"));
    if (isoHeroMatch) {
      playerSpriteFilename = String(isoHeroMatch);
    } else {
      const sprMatch = spritePngFiles.find(f => !String(f).includes("static") && !String(f).includes("actor")) || spritePngFiles[0];
      playerSpriteFilename = String(sprMatch);
    }
  }

  let playerPcxRelativePath = "assets/sprites/iso_hero.pcx";
  let playerSprWidth16 = 1;
  let playerSprHeight16 = 1;

  if (playerSpriteFilename) {
    const srcPng = pathModule.join(outputAssetsDir, "sprites", playerSpriteFilename);
    const destPcx = srcPng.replace(/\.png$/i, ".pcx");
    try {
      const dims = convertPngToPcx(srcPng, destPcx);
      playerSprWidth16 = Math.max(1, Math.min(2, Math.floor(dims.width / 16)));
      playerSprHeight16 = Math.max(1, Math.min(2, Math.floor(dims.height / 16)));
      playerPcxRelativePath = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcx).replace(/\\/g, "/")}`;
    } catch (e) {
      console.error("Error converting player sprite PNG to PCX:", e);
    }
  }

  // Resolve player start position
  const rawStartX = (typeof projectDirPath === "object" && projectDirPath?.settings?.startX !== undefined)
    ? projectDirPath.settings.startX
    : (settingsGbsData?.startX !== undefined
      ? settingsGbsData.startX
      : (projectData?.settings?.startX ?? 13));

  const rawStartY = (typeof projectDirPath === "object" && projectDirPath?.settings?.startY !== undefined)
    ? projectDirPath.settings.startY
    : (settingsGbsData?.startY !== undefined
      ? settingsGbsData.startY
      : (projectData?.settings?.startY ?? 14));

  const playerStartX = rawStartX * 8;
  const playerStartY = rawStartY * 8;

  // Resolve scene 1 & scene 2 actors separately
  let actorDirectives = "";
  let actorDefines = "";

  const scene1Actors = allScenes[0]?.actors || [];
  const scene2Actors = allScenes[1]?.actors || [];

  // Scene 1 Actor
  if (scene1Actors.length > 0) {
    const sc1Actor = scene1Actors[0];
    let sc1Filename = "kidPark.png";
    let sprObj1: any = null;
    if (sc1Actor.spriteSheetId && allSprites.length > 0) {
      sprObj1 = allSprites.find((s: any) => s.id === sc1Actor.spriteSheetId);
      if (sprObj1?.filename) sc1Filename = String(sprObj1.filename);
    }

    const sc1SrcPng = pathModule.join(outputAssetsDir, "sprites", sc1Filename);
    const sc1DestPcx = sc1SrcPng.replace(/\.png$/i, "_sc1.pcx");
    try {
      let cropX = 0;
      let cropY = 0;
      let cropW = 16;
      let cropH = 32;
      let w16 = 1;
      let h16 = 2;

      if (sprObj1) {
        const canvasW = sprObj1.canvasWidth || 16;
        const canvasH = sprObj1.canvasHeight || 32;
        cropW = canvasW;
        cropH = canvasH;
        w16 = Math.max(1, Math.min(2, Math.floor(canvasW / 16)));
        h16 = Math.max(1, Math.min(2, Math.floor(canvasH / 16)));
        cropX = getCropXForActor(sc1Actor, sprObj1, canvasW);
      } else {
        cropX = getCropXForActor(sc1Actor, null, 16);
      }

      const dims = convertPngToPcx(sc1SrcPng, sc1DestPcx, { cropX, cropY, cropW, cropH });
      if (!sprObj1) {
        w16 = Math.max(1, Math.min(2, Math.floor(dims.width / 16)));
        h16 = Math.max(1, Math.min(2, Math.floor(dims.height / 16)));
      }

      const vramSizeHex = `0x${((w16 * h16) * 0x40).toString(16).toUpperCase()}`;
      let sprSizeConst = "SZ_16x16";
      if (w16 === 1 && h16 === 2) sprSizeConst = "SZ_16x32";
      else if (w16 === 2 && h16 === 1) sprSizeConst = "SZ_32x16";
      else if (w16 === 2 && h16 === 2) sprSizeConst = "SZ_32x32";

      const relPcx = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), sc1DestPcx).replace(/\\/g, "/")}`;
      actorDirectives += `#incspr(actor_sc1_spr, "${relPcx}", 0, 0, ${w16}, ${h16})\n#incpal(actor_sc1_pal, "${relPcx}")\n`;

      const actX = (sc1Actor.x ?? 19) * 8;
      const actY = (sc1Actor.y ?? 5) * 8;
      actorDefines += `#define HAS_ACTOR_SCENE_1 1\n#define ACTOR_SCENE_1_X ${actX}\n#define ACTOR_SCENE_1_Y ${actY}\n#define ACTOR_SCENE_1_VRAM_SIZE ${vramSizeHex}\n#define ACTOR_SCENE_1_SPRITE_SIZE ${sprSizeConst}\n`;
    } catch (e) {
      console.error("Error processing Scene 1 actor sprite:", e);
    }
  }

  // Scene 2 Actor
  if (scene2Actors.length > 0) {
    const sc2Actor = scene2Actors[0];
    let sc2Filename = "actor.png";
    let sprObj2: any = null;
    if (sc2Actor.spriteSheetId && allSprites.length > 0) {
      sprObj2 = allSprites.find((s: any) => s.id === sc2Actor.spriteSheetId);
      if (sprObj2?.filename) sc2Filename = String(sprObj2.filename);
    }

    const sc2SrcPng = pathModule.join(outputAssetsDir, "sprites", sc2Filename);
    const sc2DestPcx = sc2SrcPng.replace(/\.png$/i, "_sc2.pcx");
    try {
      let cropX = 0;
      let cropY = 0;
      let cropW = 16;
      let cropH = 16;
      let w16 = 1;
      let h16 = 1;

      if (sprObj2) {
        const canvasW = sprObj2.canvasWidth || 16;
        const canvasH = sprObj2.canvasHeight || 16;
        cropW = canvasW;
        cropH = canvasH;
        w16 = Math.max(1, Math.min(2, Math.floor(canvasW / 16)));
        h16 = Math.max(1, Math.min(2, Math.floor(canvasH / 16)));
        cropX = getCropXForActor(sc2Actor, sprObj2, canvasW);
      } else {
        cropX = getCropXForActor(sc2Actor, null, 16);
      }

      const dims = convertPngToPcx(sc2SrcPng, sc2DestPcx, { cropX, cropY, cropW, cropH });
      if (!sprObj2) {
        w16 = Math.max(1, Math.min(2, Math.floor(dims.width / 16)));
        h16 = Math.max(1, Math.min(2, Math.floor(dims.height / 16)));
      }

      const vramSizeHex = `0x${((w16 * h16) * 0x40).toString(16).toUpperCase()}`;
      let sprSizeConst = "SZ_16x16";
      if (w16 === 1 && h16 === 2) sprSizeConst = "SZ_16x32";
      else if (w16 === 2 && h16 === 1) sprSizeConst = "SZ_32x16";
      else if (w16 === 2 && h16 === 2) sprSizeConst = "SZ_32x32";

      const relPcx = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), sc2DestPcx).replace(/\\/g, "/")}`;
      actorDirectives += `#incspr(actor_sc2_spr, "${relPcx}", 0, 0, ${w16}, ${h16})\n#incpal(actor_sc2_pal, "${relPcx}")\n`;

      const actX = (sc2Actor.x ?? 4) * 8;
      const actY = (sc2Actor.y ?? 22) * 8;
      actorDefines += `#define HAS_ACTOR_SCENE_2 1\n#define ACTOR_SCENE_2_X ${actX}\n#define ACTOR_SCENE_2_Y ${actY}\n#define ACTOR_SCENE_2_VRAM_SIZE ${vramSizeHex}\n#define ACTOR_SCENE_2_SPRITE_SIZE ${sprSizeConst}\n`;
    } catch (e) {
      console.error("Error processing Scene 2 actor sprite:", e);
    }
  }

  // Resolve Triggers
  let triggerDefines = "";
  const scene1Triggers = allScenes[0]?.triggers || [];
  const scene2Triggers = allScenes[1]?.triggers || [];

  let triggerIndex = 1;
  const parseCoord = (val: any, fallback: number) => {
    if (typeof val === "number" && !isNaN(val)) return Math.floor(val) * 8;
    if (typeof val === "object" && val !== null && typeof val.value === "number" && !isNaN(val.value)) return Math.floor(val.value) * 8;
    if (typeof val === "string" && !isNaN(Number(val))) return Math.floor(Number(val)) * 8;
    return fallback * 8;
  };

  const scene1Id = allScenes[0]?.id;
  const scene2Id = allScenes[1]?.id;

  const resolveTargetScene = (scId: string, defaultSceneNum: number) => {
    if (scId && scId === scene1Id) return 1;
    if (scId && scId === scene2Id) return 2;
    return defaultSceneNum;
  };

  scene1Triggers.forEach((tr: any) => {
    let targetScene = 2;
    let targetX = 16 * 8;
    let targetY = 16 * 8;

    if (tr.script && tr.script.length > 0) {
      const switchCmd = tr.script.find((c: any) => c.command === "EVENT_SWITCH_SCENE");
      if (switchCmd && switchCmd.args) {
        targetScene = resolveTargetScene(switchCmd.args.sceneId, 2);
        targetX = parseCoord(switchCmd.args.x, 16);
        targetY = parseCoord(switchCmd.args.y, 16);
      }
    }

    const tx = (tr.x ?? 0) * 8;
    const ty = (tr.y ?? 0) * 8;
    const tw = (tr.width ?? 2) * 8;
    const th = (tr.height ?? 2) * 8;

    triggerDefines += `#define HAS_TRIGGER_${triggerIndex} 1\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_SCENE 1\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_X ${tx}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_Y ${ty}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_W ${tw}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_H ${th}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_TARGET_SCENE ${targetScene}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_TARGET_X ${targetX}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_TARGET_Y ${targetY}\n`;
    triggerIndex++;
  });

  scene2Triggers.forEach((tr: any) => {
    let targetScene = 1;
    let targetX = 19 * 8;
    let targetY = 7 * 8;

    if (tr.script && tr.script.length > 0) {
      const switchCmd = tr.script.find((c: any) => c.command === "EVENT_SWITCH_SCENE");
      if (switchCmd && switchCmd.args) {
        targetScene = resolveTargetScene(switchCmd.args.sceneId, 1);
        targetX = parseCoord(switchCmd.args.x, 19);
        targetY = parseCoord(switchCmd.args.y, 7);
      }
    }

    const tx = (tr.x ?? 0) * 8;
    const ty = (tr.y ?? 0) * 8;
    const tw = (tr.width ?? 2) * 8;
    const th = (tr.height ?? 2) * 8;

    triggerDefines += `#define HAS_TRIGGER_${triggerIndex} 1\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_SCENE 2\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_X ${tx}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_Y ${ty}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_W ${tw}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_H ${th}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_TARGET_SCENE ${targetScene}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_TARGET_X ${targetX}\n`;
    triggerDefines += `#define TRIGGER_${triggerIndex}_TARGET_Y ${targetY}\n`;
    triggerIndex++;
  });

  // Look for music tracks (.uge files)
  let musicIncludes = "";
  let hasMusicDef = "";
  const musicAssetsDir = pathModule.join(outputAssetsDir, "music");
  const projectMusicDir = pathModule.join(projDir, "assets", "music");

  // Map musicId to resource info from .gbsres files
  const musicIdMap: Record<string, { filename: string; symbol: string }> = {};
  const musicDirsToScan = [projectMusicDir, musicAssetsDir];

  for (const mDir of musicDirsToScan) {
    if (fs.existsSync(mDir)) {
      const gbsresFiles = fs.readdirSync(mDir).filter((f: any) => typeof f === "string" && f.endsWith(".gbsres"));
      for (const gbf of gbsresFiles) {
        try {
          const mJson = fs.readJsonSync(pathModule.join(mDir, gbf));
          if (mJson && mJson.id && mJson.filename) {
            musicIdMap[mJson.id] = {
              filename: mJson.filename,
              symbol: mJson.symbol || "song_0",
            };
          }
        } catch (e) { }
      }
    }
  }

  // Find requested music file for Scene 1
  let targetUgeFilename = "";
  let targetUgeSymbol = "song_0";

  // Check Scene 1 script for EVENT_MUSIC_PLAY
  if (allScenes[0]?.script && Array.isArray(allScenes[0].script)) {
    const playCmd = allScenes[0].script.find((c: any) => c.command === "EVENT_MUSIC_PLAY");
    if (playCmd && playCmd.args?.musicId && musicIdMap[playCmd.args.musicId]) {
      targetUgeFilename = musicIdMap[playCmd.args.musicId].filename;
      targetUgeSymbol = musicIdMap[playCmd.args.musicId].symbol;
    }
  }

  // Fallback to adventure.uge if present in project music
  if (!targetUgeFilename) {
    for (const mDir of musicDirsToScan) {
      if (fs.existsSync(pathModule.join(mDir, "adventure.uge"))) {
        targetUgeFilename = "adventure.uge";
        targetUgeSymbol = "song_adventure";
        break;
      }
    }
  }

  // Fallback to first .uge file found
  if (!targetUgeFilename) {
    for (const mDir of musicDirsToScan) {
      if (fs.existsSync(mDir)) {
        const ugeFiles = fs.readdirSync(mDir).filter((f: any) => typeof f === "string" && f.endsWith(".uge"));
        if (ugeFiles.length > 0) {
          targetUgeFilename = String(ugeFiles[0]);
          break;
        }
      }
    }
  }

  let foundUgePath = "";
  if (targetUgeFilename) {
    for (const mDir of musicDirsToScan) {
      const p = pathModule.join(mDir, targetUgeFilename);
      if (fs.existsSync(p)) {
        foundUgePath = p;
        break;
      }
    }
  }

  if (!foundUgePath) {
    const templateUge = pathModule.resolve(__dirname, "../../appData/templates/gbs2/assets/music/Rulz_Intro.uge");
    if (fs.existsSync(templateUge)) {
      foundUgePath = templateUge;
    }
  }

  if (foundUgePath && fs.existsSync(foundUgePath)) {
    try {
      const { loadUGESong, exportToC } = require("shared/lib/uge/ugeHelper");
      const ugeBuf = await fs.readFile(foundUgePath);
      const song = loadUGESong(ugeBuf);
      if (song) {
        const musicC = exportToC(song, "song_0");
        const musicOutDir = pathModule.join(buildDir, "music");
        await fs.ensureDir(musicOutDir);
        await fs.writeFile(pathModule.join(musicOutDir, "song_0.c"), musicC, "utf8");
        musicIncludes = `#include "music/song_0.c"\n`;
        hasMusicDef = `#define HAS_MUSIC_DATA 1\n`;
      }
    } catch (e) {
      console.error("Error processing UGE music file:", e);
    }
  }

  const mainCContent = `
#include <huc.h>
#include "include/engine.h"

#incspr(player_spr, "${playerPcxRelativePath}", 0, 0, ${playerSprWidth16}, ${playerSprHeight16})
#incpal(player_pal, "${playerPcxRelativePath}")

#incchr(bg_scene1_chr, "assets/backgrounds/${scene1BgFilename}", 0, 0, 32, 28)
#incpal(bg_scene1_pal, "assets/backgrounds/${scene1BgFilename}")
#incbat(bg_scene1_bat, "assets/backgrounds/${scene1BgFilename}", 0x1000, 32, 28)

#incchr(bg_scene2_chr, "assets/backgrounds/${scene2BgFilename}", 0, 0, 32, 28)
#incpal(bg_scene2_pal, "assets/backgrounds/${scene2BgFilename}")
#incbat(bg_scene2_bat, "assets/backgrounds/${scene2BgFilename}", 0x1000, 32, 28)

${actorDirectives}

#define PLAYER_START_X ${playerStartX}
#define PLAYER_START_Y ${playerStartY}
#define HAS_SCENE_2 1
${hasMusicDef}

${actorDefines}
${triggerDefines}

#include "scene_1_collisions.c"
#include "scene_2_collisions.c"
#include "src/pce_sound.c"
${musicIncludes}
#include "src/engine.c"
#include "src/actor.c"
#include "src/camera.c"
#include "src/collision.c"
#include "src/trigger.c"
#include "src/vm.c"
#include "src/pce_system.c"

main() {
    engine_run();
}
`;

  const mainCPath = pathModule.join(buildDir, "main.c");
  await fs.writeFile(mainCPath, mainCContent);

  const makeBuildModule = require("./makeBuild");
  const makeBuildFn = makeBuildModule.default || makeBuildModule.makeBuild || makeBuildModule;
  const romFilename = typeof outputBuildDir === "object" && outputBuildDir?.romFilename ? outputBuildDir.romFilename : "pcetest1.pce";

  if (typeof makeBuildFn === "function") {
    try {
      await makeBuildFn({
        buildRoot: buildDir,
        romFilename,
      });
    } catch (e) {
      console.error("Error executing makeBuild in buildProject:", e);
    }
  }

  return { mainCPath };
}

export default buildProject;
