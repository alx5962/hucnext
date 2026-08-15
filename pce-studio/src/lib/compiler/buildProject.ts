import fs from "fs-extra";
import Path from "path";
import { convertPngToPcx } from "./convertPngToPcx";
import convertToIndexedPngDefault, { convertToIndexedPng as convertToIndexedPngFn } from "./indexedPngWriter";

const pathModule = (Path as any).default || Path;
const convertToIndexedPng = (convertToIndexedPngDefault || convertToIndexedPngFn) as typeof convertToIndexedPngFn;

/**
 * Maps scene type keys (from editor) to SCENE_TYPE_* numeric constants.
 * Must stay in sync with appData/engine/pcevm/include/engine.h
 */
const SCENE_TYPE_MAP: Record<string, number> = {
  TOPDOWN: 0,
  PLATFORM: 1,
  ADVENTURE: 2,
  SHMUP: 3,
  POINTNCLICK: 4,
  LOGO: 5,
};

function extractActorText(actor: any): string {
  if (!actor || !actor.script || !Array.isArray(actor.script)) return "";

  const findTextInEvents = (events: any[]): string => {
    for (const evt of events) {
      if (!evt) continue;
      if (evt.command === "EVENT_TEXT" || evt.command === "EVENT_TEXT_DRAW" || evt.command === "EVENT_DIALOGUE") {
        const textVal = evt.args?.text;
        if (typeof textVal === "string") return textVal;
        if (Array.isArray(textVal) && typeof textVal[0] === "string") return textVal[0];
        if (typeof textVal === "object" && textVal !== null && textVal.value) return String(textVal.value);
      }
      if (evt.children) {
        for (const key of Object.keys(evt.children)) {
          if (Array.isArray(evt.children[key])) {
            const res = findTextInEvents(evt.children[key]);
            if (res) return res;
          }
        }
      }
    }
    return "";
  };

  return findTextInEvents(actor.script);
}

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
  try {
    if (fs.existsSync(defaultEngineRoot)) {
      await fs.copy(defaultEngineRoot, buildDir, { overwrite: true, errorOnExist: false });
    }
  } catch (e) {
    // Ignore transient EPERM file lock issues when overwriting engine files
  }

  // Look for project files (.gbsproj or project directory)
  let projectData: any = (typeof projectDirPath === "object" && projectDirPath !== null) ? projectDirPath : {};
  const projectJsonPath = pathModule.join(projDir, "project.gbsproj");
  if (fs.existsSync(projectJsonPath)) {
    try {
      const diskData = await fs.readJson(projectJsonPath);
      projectData = { ...diskData, ...projectData };
    } catch (e) { }
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
  if (fs.existsSync(outputAssetsDir)) {
    await fs.remove(outputAssetsDir);
  }
  if (fs.existsSync(assetsDir)) {
    await fs.copy(assetsDir, outputAssetsDir, { overwrite: true });
  }

  // Parse sprite gbsres files
  const spritesFromGbsres: any[] = [];
  const projectSpritesResDir = pathModule.join(projDir, "project", "sprites");
  const assetsSpritesResDir = pathModule.join(projDir, "assets", "sprites");
  for (const sDir of [projectSpritesResDir, assetsSpritesResDir]) {
    if (fs.existsSync(sDir)) {
      const gbsFiles = fs.readdirSync(sDir).filter(f => typeof f === "string" && f.endsWith(".gbsres"));
      for (const gf of gbsFiles) {
        try {
          const json = fs.readJsonSync(pathModule.join(sDir, gf));
          if (json) {
            spritesFromGbsres.push(json);
          }
        } catch (e) { }
      }
    }
  }

  const allSprites = [...(projectData.sprites || []), ...spritesFromGbsres];

  // Parse scene and actor gbsres files
  let scenesFromGbsres: any[] = [];
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

  if (settingsGbsData && Array.isArray(settingsGbsData.sceneIds) && scenesFromGbsres.length > 0) {
    const sceneMap = new Map<string, any>();
    scenesFromGbsres.forEach((sc: any) => {
      if (sc.id) sceneMap.set(sc.id, sc);
    });
    const orderedScenes: any[] = [];
    settingsGbsData.sceneIds.forEach((scId: string) => {
      if (sceneMap.has(scId)) {
        orderedScenes.push(sceneMap.get(scId));
        sceneMap.delete(scId);
      }
    });
    sceneMap.forEach((sc) => orderedScenes.push(sc));
    if (orderedScenes.length > 0) {
      scenesFromGbsres = orderedScenes;
    }
  } else if (scenesFromGbsres.length > 0) {
    scenesFromGbsres.sort((a, b) => {
      const numA = parseInt((a.name || "").replace(/\D/g, "")) || 0;
      const numB = parseInt((b.name || "").replace(/\D/g, "")) || 0;
      if (numA && numB) return numA - numB;
      return 0;
    });
  }

  const allScenes = (projectData.scenes && projectData.scenes.length > 0)
    ? projectData.scenes
    : (scenesFromGbsres.length > 0 ? scenesFromGbsres : []);

  // Parse background gbsres files and projectData.backgrounds
  const bgsFromGbsres: any[] = [];
  const projectBgResDir = pathModule.join(projDir, "project", "backgrounds");
  const bgAssetsResDir = pathModule.join(projDir, "assets", "backgrounds");
  const projectBgDir = pathModule.join(projDir, "assets", "backgrounds");
  const bgDirsToScan = [projectBgDir, projectBgResDir, bgAssetsResDir];

  for (const bDir of bgDirsToScan) {
    if (fs.existsSync(bDir)) {
      const gbsFiles = fs.readdirSync(bDir).filter((f: any) => typeof f === "string" && f.endsWith(".gbsres"));
      for (const gf of gbsFiles) {
        try {
          const json = fs.readJsonSync(pathModule.join(bDir, gf));
          if (json) {
            bgsFromGbsres.push(json);
          }
        } catch (e) { }
      }
    }
  }

  const allBackgrounds = [...(projectData.backgrounds || []), ...bgsFromGbsres];
  const bgIdMap: Record<string, string> = {};
  allBackgrounds.forEach((bg: any) => {
    if (bg) {
      const fn = bg.filename || (bg.name ? (bg.name.endsWith(".png") ? bg.name : `${bg.name}.png`) : "");
      if (fn) {
        if (bg.id) bgIdMap[bg.id] = fn;
        if (bg.name) bgIdMap[bg.name] = fn;
        if (bg.symbol) bgIdMap[bg.symbol] = fn;
        bgIdMap[fn] = fn;
      }
    }
  });

  // Load platformer settings from project/engine_field_values.gbsres if present
  let engineFieldValuesMap: Record<string, any> = {};
  const engineFieldsGbsPath = pathModule.join(projDir, "project", "engine_field_values.gbsres");
  if (fs.existsSync(engineFieldsGbsPath)) {
    try {
      const efJson = fs.readJsonSync(engineFieldsGbsPath);
      if (efJson && Array.isArray(efJson.engineFieldValues)) {
        for (const ef of efJson.engineFieldValues) {
          if (ef && ef.id) {
            engineFieldValuesMap[ef.id] = ef.value;
          }
        }
      }
    } catch (e) { }
  }

  const rawWalkVel = typeof engineFieldValuesMap["plat_walk_vel"] === "number" ? engineFieldValuesMap["plat_walk_vel"] : 6400;
  const rawGrav = typeof engineFieldValuesMap["plat_grav"] === "number" ? engineFieldValuesMap["plat_grav"] : 1792;
  const rawMaxFall = typeof engineFieldValuesMap["plat_max_fall_vel"] === "number" ? engineFieldValuesMap["plat_max_fall_vel"] : 20000;

  // Convert 16-bit fixed point engine field values to PC Engine subpixels (8 subpixels = 1 pixel)
  const platWalkSubpx = Math.max(1, Math.round(rawWalkVel / 512));
  const platGravitySubpx = Math.max(1, Math.round(rawGrav / 512));
  const platMaxFallSubpx = Math.max(4, Math.round(rawMaxFall / 512));
  const platJumpVelSubpx = Math.max(16, Math.round(Math.sqrt(2 * platGravitySubpx * 210)));

  const sceneBgFilenames: string[] = [];
  const sceneTypeDefineList: string[] = [];

  const getSceneBgFilename = (scene: any, idx: number): string => {
    if (scene) {
      if (scene.backgroundId && bgIdMap[scene.backgroundId]) {
        return bgIdMap[scene.backgroundId];
      }
      if (scene.backgroundId) {
        const matchedBg = allBackgrounds.find((b: any) => b.id === scene.backgroundId || b.name === scene.backgroundId || b.filename === scene.backgroundId);
        if (matchedBg) {
          const fn = matchedBg.filename || (matchedBg.name.endsWith(".png") ? matchedBg.name : `${matchedBg.name}.png`);
          return fn;
        }
        if (typeof scene.backgroundId === "string") {
          const checkName = scene.backgroundId.endsWith(".png") ? scene.backgroundId : `${scene.backgroundId}.png`;
          for (const bDir of bgDirsToScan) {
            if (fs.existsSync(pathModule.join(bDir, checkName))) {
              return checkName;
            }
          }
        }
      }
      if (scene.background && typeof scene.background === "object") {
        if (scene.background.filename) return scene.background.filename;
        if (scene.background.name) {
          const fn = scene.background.name.endsWith(".png") ? scene.background.name : `${scene.background.name}.png`;
          return fn;
        }
        if (scene.background.id && bgIdMap[scene.background.id]) {
          return bgIdMap[scene.background.id];
        }
      }
      if (scene.filename) {
        return scene.filename;
      }
      if (scene.name) {
        const nameClean = scene.name.toLowerCase().replace(/\s+/g, "");
        const checkPng = `${nameClean}.png`;
        for (const bDir of bgDirsToScan) {
          if (fs.existsSync(pathModule.join(bDir, checkPng))) {
            return checkPng;
          }
        }
      }
    }

    for (const bDir of bgDirsToScan) {
      if (fs.existsSync(bDir)) {
        const pngFiles = fs.readdirSync(bDir).filter((f: any) => typeof f === "string" && f.endsWith(".png"));
        const scNumPng = `scene${idx + 1}.png`;
        if (pngFiles.includes(scNumPng)) {
          return scNumPng;
        }
        const scPng = `scene_${idx + 1}.png`;
        if (pngFiles.includes(scPng)) {
          return scPng;
        }
      }
    }

    for (const bDir of bgDirsToScan) {
      if (fs.existsSync(bDir)) {
        const pngFiles = fs.readdirSync(bDir).filter((f: any) => typeof f === "string" && f.endsWith(".png"));
        if (pngFiles.length > 0) {
          return pngFiles[idx % pngFiles.length];
        }
      }
    }
    return "scene.png";
  };

  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const bgFile = getSceneBgFilename(scene, idx);
    sceneBgFilenames.push(bgFile);

    const scType: string = (scene.type || "TOPDOWN").toUpperCase();
    const scTypeNum = SCENE_TYPE_MAP[scType] ?? SCENE_TYPE_MAP["TOPDOWN"];
    sceneTypeDefineList.push(`#define SCENE_${scNum}_TYPE ${scTypeNum}`);
    sceneTypeDefineList.push(`#define HAS_SCENE_${scNum} 1`);
  });

  const firstType = (allScenes[0]?.type || "TOPDOWN").toUpperCase();
  const firstTypeNum = SCENE_TYPE_MAP[firstType] ?? SCENE_TYPE_MAP["TOPDOWN"];
  const sceneTypeDefine = sceneTypeDefineList.join("\n") + `\n#define SCENE_TYPE ${firstTypeNum}\n#define PLAT_WALK_SUBPX ${platWalkSubpx}\n#define PLAT_GRAVITY ${platGravitySubpx}\n#define PLAT_JUMP_SUBPX ${platJumpVelSubpx}\n#define PLAT_MAX_FALL ${platMaxFallSubpx}\n`;

  // Ensure background PNGs exist in build assets/backgrounds directory
  const destBgDir = pathModule.join(buildDir, "assets", "backgrounds");
  await fs.ensureDir(destBgDir);

  // Build a map: bgFilename -> max colors needed (256 for Logo scenes, 16 for others)
  const bgFileMaxColors = new Map<string, number>();
  sceneBgFilenames.forEach((bgFile, idx) => {
    const scType = (allScenes[idx]?.type || "TOPDOWN").toUpperCase();
    const needed = scType === "LOGO" ? 256 : 16;
    const prev = bgFileMaxColors.get(bgFile) ?? 0;
    bgFileMaxColors.set(bgFile, Math.max(prev, needed));
  });

  const uniqueBgFiles = Array.from(new Set(sceneBgFilenames));
  for (const bgFile of uniqueBgFiles) {
    for (const bDir of bgDirsToScan) {
      const srcPng = pathModule.join(bDir, bgFile);
      if (fs.existsSync(srcPng)) {
        const destPng = pathModule.join(destBgDir, bgFile);
        const maxColors = bgFileMaxColors.get(bgFile) ?? 16;
        try {
          convertToIndexedPng(srcPng, destPng, maxColors);
        } catch (e) {
          await fs.copy(srcPng, destPng, { overwrite: true });
        }
        break;
      }
    }
  }

  let bgDirectives = "";
  const bgSymbolMap = new Map<string, string>();
  let bgUniqueIndex = 0;

  sceneBgFilenames.forEach((bgFile, idx) => {
    const scNum = idx + 1;
    const sceneType = (allScenes[idx]?.type || "TOPDOWN").toUpperCase();
    const palArgs = sceneType === "LOGO" ? ", 0, 16" : "";
    const key = `${bgFile}|${palArgs}`;

    if (!bgSymbolMap.has(key)) {
      const symPrefix = `bg_file_${bgUniqueIndex++}`;
      bgSymbolMap.set(key, symPrefix);
      bgDirectives += `#incchr(${symPrefix}_chr, "assets/backgrounds/${bgFile}", 0, 0, 32, 28)\n`;
      bgDirectives += `#incpal(${symPrefix}_pal, "assets/backgrounds/${bgFile}"${palArgs})\n`;
      bgDirectives += `#incbat(${symPrefix}_bat, "assets/backgrounds/${bgFile}", 0x1000, 32, 28)\n`;
    }

    const symPrefix = bgSymbolMap.get(key)!;
    bgDirectives += `#define bg_scene${scNum}_chr ${symPrefix}_chr\n`;
    bgDirectives += `#define bg_scene${scNum}_pal ${symPrefix}_pal\n`;
    bgDirectives += `#define bg_scene${scNum}_bat ${symPrefix}_bat\n`;
  });

  let collisionIncludes = "";
  const colSymbolMap = new Map<string, string>();
  let colUniqueIndex = 0;

  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const colFileName = `scene_${scNum}_collisions.c`;
    const colFilePath = pathModule.join(buildDir, colFileName);

    let colBytes = new Uint8Array(32 * 28);
    if (scene.collisions && Array.isArray(scene.collisions)) {
      const len = Math.min(colBytes.length, scene.collisions.length);
      for (let i = 0; i < len; i++) {
        colBytes[i] = scene.collisions[i];
      }
    }

    const key = Array.from(colBytes).join(",");
    let symName = "";
    let colHeaderContent = "";

    if (!colSymbolMap.has(key)) {
      symName = `col_data_${colUniqueIndex++}`;
      colSymbolMap.set(key, symName);

      const lines: string[] = [];
      for (let i = 0; i < colBytes.length; i += 16) {
        const chunk = Array.from(colBytes.slice(i, i + 16)).map(c => `0x${c.toString(16).padStart(2, "0").toUpperCase()}`);
        lines.push(`  ${chunk.join(", ")}`);
      }
      colHeaderContent = `#include "include/gbs_types.h"\n\nconst unsigned char ${symName}[] = {\n${lines.join(",\n")}\n};\n#define scene_${scNum}_collisions ${symName}\n`;
    } else {
      symName = colSymbolMap.get(key)!;
      colHeaderContent = `#define scene_${scNum}_collisions ${symName}\n`;
    }

    fs.writeFileSync(colFilePath, colHeaderContent, "utf8");

    collisionIncludes += `#define HAS_SCENE_${scNum}_COLLISIONS 1\n`;
    collisionIncludes += `#include "${colFileName}"\n`;
  });

  const parseCoord = (val: any, fallback: number) => {
    if (typeof val === "number" && !isNaN(val)) return Math.floor(val) * 8;
    if (typeof val === "object" && val !== null && typeof val.value === "number" && !isNaN(val.value)) return Math.floor(val.value) * 8;
    if (typeof val === "object" && val !== null && typeof val.x === "number" && !isNaN(val.x)) return Math.floor(val.x) * 8;
    if (typeof val === "string" && !isNaN(Number(val))) return Math.floor(Number(val)) * 8;
    return fallback * 8;
  };

  const sceneIdToNum: Record<string, number> = {};
  allScenes.forEach((scene: any, idx: number) => {
    if (scene.id) {
      sceneIdToNum[scene.id] = idx + 1;
    }
  });

  const startSceneId = (typeof projectDirPath === "object" && projectDirPath?.settings?.startSceneId !== undefined)
    ? projectDirPath.settings.startSceneId
    : (settingsGbsData?.startSceneId !== undefined
      ? settingsGbsData.startSceneId
      : (projectData?.settings?.startSceneId ?? ""));

  let startSceneNum = 1;
  if (startSceneId) {
    if (sceneIdToNum[startSceneId]) {
      startSceneNum = sceneIdToNum[startSceneId];
    } else {
      const targetStr = String(startSceneId).trim().toLowerCase().replace(/\s+/g, "");
      const foundIdx = allScenes.findIndex((s: any) => {
        if (!s) return false;
        if (s.id === startSceneId || s.name === startSceneId) return true;
        const sName = String(s.name || "").trim().toLowerCase().replace(/\s+/g, "");
        const sId = String(s.id || "").trim().toLowerCase().replace(/\s+/g, "");
        return sName === targetStr || sId === targetStr || sName.endsWith(targetStr) || targetStr.endsWith(sName);
      });
      if (foundIdx !== -1) {
        startSceneNum = foundIdx + 1;
      }
    }
  }

  // Resolve player sprite sheet ID dynamically
  const activeStartScene = (startSceneNum > 0 && startSceneNum <= allScenes.length) ? allScenes[startSceneNum - 1] : allScenes[0];
  const activeStartSceneType = (activeStartScene?.type || "TOPDOWN").toUpperCase();

  const projectSpritesDir = pathModule.join(projDir, "assets", "sprites");
  const destSpritesDir = pathModule.join(outputAssetsDir, "sprites");
  await fs.ensureDir(destSpritesDir);

  const spritePngFiles = fs.existsSync(projectSpritesDir)
    ? fs.readdirSync(projectSpritesDir).filter(f => typeof f === "string" && f.endsWith(".png"))
    : [];

  let playerSpriteSheetId = "";

  // 1. Check gameplay scenes (non-LOGO) for user-specified playerSpriteSheetId
  const gameSceneWithPlayer = allScenes.find((s: any) => s && String(s.type).toUpperCase() !== "LOGO" && (s.playerSpriteSheetId || s.playerSprite?.id));
  if (gameSceneWithPlayer) {
    playerSpriteSheetId = gameSceneWithPlayer.playerSpriteSheetId || gameSceneWithPlayer.playerSprite?.id;
  }

  // 2. Check defaultPlayerSprites map for gameplay scene types
  if (!playerSpriteSheetId) {
    const defSpritesMap = projectData?.settings?.defaultPlayerSprites || settingsGbsData?.defaultPlayerSprites || projectDirPath?.settings?.defaultPlayerSprites;
    if (defSpritesMap && typeof defSpritesMap === "object") {
      playerSpriteSheetId = defSpritesMap["PLATFORM"] || defSpritesMap["TOPDOWN"] || defSpritesMap["ADVENTURE"] || Object.values(defSpritesMap)[0];
    }
  }

  // 3. Fallback to start scene or general settings
  if (!playerSpriteSheetId) {
    if (activeStartScene) {
      playerSpriteSheetId = activeStartScene.playerSpriteSheetId || activeStartScene.playerSprite?.id;
    }
    if (!playerSpriteSheetId) {
      if (projectData?.settings?.playerSpriteSheetId) {
        playerSpriteSheetId = projectData.settings.playerSpriteSheetId;
      } else if (settingsGbsData?.playerSpriteSheetId) {
        playerSpriteSheetId = settingsGbsData.playerSpriteSheetId;
      } else if (projectDirPath?.settings?.playerSpriteSheetId) {
        playerSpriteSheetId = projectDirPath.settings.playerSpriteSheetId;
      }
    }
  }

  let playerSpriteFilename = "";
  let playerSprObj: any = null;
  if (playerSpriteSheetId && allSprites.length > 0) {
    playerSprObj = allSprites.find((s: any) =>
      s.id === playerSpriteSheetId ||
      s.name === playerSpriteSheetId ||
      s.symbol === playerSpriteSheetId ||
      s.filename === playerSpriteSheetId
    );
    if (playerSprObj?.filename) {
      playerSpriteFilename = String(playerSprObj.filename);
    }
  }

  if (!playerSpriteFilename && spritePngFiles.length > 0) {
    if (typeof playerSpriteSheetId === "string" && playerSpriteSheetId.length > 0) {
      const matchName = spritePngFiles.find(f => f.toLowerCase().includes(playerSpriteSheetId.toLowerCase()));
      if (matchName) playerSpriteFilename = matchName;
    }
    if (!playerSpriteFilename) {
      const nonActorMatch = spritePngFiles.find(f => !String(f).includes("static") && !String(f).includes("actor"));
      playerSpriteFilename = String(nonActorMatch || spritePngFiles[0]);
    }
  }

  let playerPcxRelativePathR0 = "assets/sprites/player_r0.pcx";
  let playerPcxRelativePathR1 = "";
  let playerPcxRelativePathL0 = "assets/sprites/player_l0.pcx";
  let playerPcxRelativePathL1 = "";
  let hasPlayerFrame1 = false;
  let playerSprWidth16 = 1;
  let playerSprHeight16 = 1;

  if (playerSpriteFilename) {
    const srcPng = pathModule.join(projectSpritesDir, playerSpriteFilename);
    const destPcxR0 = pathModule.join(destSpritesDir, playerSpriteFilename.replace(/\.png$/i, "_r0.pcx"));
    const destPcxR1 = pathModule.join(destSpritesDir, playerSpriteFilename.replace(/\.png$/i, "_r1.pcx"));
    const destPcxL0 = pathModule.join(destSpritesDir, playerSpriteFilename.replace(/\.png$/i, "_l0.pcx"));
    const destPcxL1 = pathModule.join(destSpritesDir, playerSpriteFilename.replace(/\.png$/i, "_l1.pcx"));

    try {
      let playerCropX0 = 0;
      let playerCropY0 = 0;
      let playerCropX1 = -1;
      let playerCropY1 = 0;
      let playerCropW = 16;
      let playerCropH = 16;

      if (playerSprObj) {
        playerCropW = playerSprObj.canvasWidth || 16;
        playerCropH = playerSprObj.canvasHeight || 16;
        playerSprWidth16 = Math.max(1, Math.min(2, Math.ceil(playerCropW / 16)));
        playerSprHeight16 = Math.max(1, Math.min(2, Math.ceil(playerCropH / 16)));

        try {
          const tile0 = playerSprObj?.states?.[0]?.animations?.[0]?.frames?.[0]?.tiles?.[0];
          if (tile0 && typeof tile0.sliceX === "number") playerCropX0 = tile0.sliceX;
          if (tile0 && typeof tile0.sliceY === "number") playerCropY0 = tile0.sliceY;
        } catch (e) { }

        try {
          const animMoving = playerSprObj?.states?.[0]?.animations?.[4] || playerSprObj?.states?.[0]?.animations?.[1];
          if (animMoving && animMoving.frames?.[0]?.tiles?.[0]) {
            const tile1 = animMoving.frames[0].tiles[0];
            if (typeof tile1.sliceX === "number") playerCropX1 = tile1.sliceX;
            if (typeof tile1.sliceY === "number") playerCropY1 = tile1.sliceY;
          } else if (playerSprObj?.states?.[0]?.animations?.[0]?.frames?.[1]?.tiles?.[0]) {
            const tile1 = playerSprObj.states[0].animations[0].frames[1].tiles[0];
            if (typeof tile1.sliceX === "number") playerCropX1 = tile1.sliceX;
            if (typeof tile1.sliceY === "number") playerCropY1 = tile1.sliceY;
          }
        } catch (e) { }
      }

      const pngData = fs.readFileSync(srcPng);
      const { PNG } = require("pngjs");
      const readPng = PNG.sync.read(pngData);

      if (playerCropX1 < 0) {
        if (readPng.width >= playerCropX0 + playerCropW * 2) {
          playerCropX1 = playerCropX0 + playerCropW;
          playerCropY1 = playerCropY0;
        }
      }

      // Convert Right frames
      const dims0 = convertPngToPcx(srcPng, destPcxR0, {
        cropX: playerCropX0,
        cropY: playerCropY0,
        cropW: playerCropW,
        cropH: playerCropH,
        flipX: false,
      });

      // Convert Left frames (software flipped!)
      convertPngToPcx(srcPng, destPcxL0, {
        cropX: playerCropX0,
        cropY: playerCropY0,
        cropW: playerCropW,
        cropH: playerCropH,
        flipX: true,
      });

      if (!playerSprObj) {
        playerSprWidth16 = Math.max(1, Math.min(2, Math.floor(dims0.width / 16)));
        playerSprHeight16 = Math.max(1, Math.min(2, Math.floor(dims0.height / 16)));
      }

      playerPcxRelativePathR0 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxR0).replace(/\\/g, "/")}`;
      playerPcxRelativePathL0 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxL0).replace(/\\/g, "/")}`;

      if (playerCropX1 >= 0 && playerCropX1 < readPng.width) {
        convertPngToPcx(srcPng, destPcxR1, {
          cropX: playerCropX1,
          cropY: playerCropY1,
          cropW: playerCropW,
          cropH: playerCropH,
          flipX: false,
        });
        convertPngToPcx(srcPng, destPcxL1, {
          cropX: playerCropX1,
          cropY: playerCropY1,
          cropW: playerCropW,
          cropH: playerCropH,
          flipX: true,
        });
        playerPcxRelativePathR1 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxR1).replace(/\\/g, "/")}`;
        playerPcxRelativePathL1 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxL1).replace(/\\/g, "/")}`;
        hasPlayerFrame1 = true;
      }
    } catch (e) {
      console.error("Error converting player sprite frames to PCX:", e);
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

  const playerStartX = parseCoord(rawStartX, 13);
  const playerStartY = parseCoord(rawStartY, 14) - (playerSprHeight16 * 16) + 8;

  function checkActorHiddenState(scene: any, targetActorId: string, isPlayer: boolean): boolean {
    let isHidden = false;

    if (!isPlayer && targetActorId) {
      const actorObj = (scene.actors || []).find((a: any) => a.id === targetActorId);
      if (actorObj) {
        if (actorObj.isHide || actorObj.hidden || actorObj.isHide === 1 || actorObj.hidden === 1) {
          isHidden = true;
        }
      }
    }

    const checkEvents = (events: any[], currentOwnerId?: string) => {
      if (!Array.isArray(events)) return;
      for (const evt of events) {
        if (evt && typeof evt === "object") {
          if (!evt.args?.__comment) {
            if (evt.command === "EVENT_ACTOR_HIDE") {
              const actArg = evt.args?.actorId;
              if (
                (isPlayer && (actArg === "player" || (actArg === "$self$" && !currentOwnerId))) ||
                (!isPlayer && (actArg === targetActorId || (actArg === "$self$" && currentOwnerId === targetActorId)))
              ) {
                isHidden = true;
              }
            } else if (evt.command === "EVENT_ACTOR_SHOW") {
              const actArg = evt.args?.actorId;
              if (
                (isPlayer && (actArg === "player" || (actArg === "$self$" && !currentOwnerId))) ||
                (!isPlayer && (actArg === targetActorId || (actArg === "$self$" && currentOwnerId === targetActorId)))
              ) {
                isHidden = false;
              }
            }
          }
          if (evt.children && typeof evt.children === "object") {
            Object.values(evt.children).forEach((childEvents: any) => {
              checkEvents(childEvents, currentOwnerId);
            });
          }
          if (evt.true && Array.isArray(evt.true)) checkEvents(evt.true, currentOwnerId);
          if (evt.false && Array.isArray(evt.false)) checkEvents(evt.false, currentOwnerId);
        }
      }
    };

    // Check scene startup scripts ONLY (startScript / scene.script)
    checkEvents(scene.script, undefined);
    checkEvents(scene.startScript, undefined);

    // Check all actors' startup scripts ONLY (startScript)
    (scene.actors || []).forEach((act: any) => {
      checkEvents(act.startScript, act.id);
    });

    return isHidden;
  }

  function getInteractionDefines(scene: any, scActor: any, sceneNum: number, actorNum: number): string {
    let defs = "";
    if (!scActor.script || !Array.isArray(scActor.script)) return defs;

    const findTargetNum = (actArg: string): number => {
      if (actArg === "player") return 0;
      if (actArg === "$self$") return actorNum;
      const targetIdx = (scene.actors || []).findIndex((a: any) => a.id === actArg);
      if (targetIdx !== -1) return targetIdx + 1;
      return -1;
    };

    const scanEvents = (events: any[]) => {
      if (!Array.isArray(events)) return;
      for (const evt of events) {
        if (evt && typeof evt === "object" && !evt.args?.__comment) {
          if (evt.command === "EVENT_ACTOR_SHOW") {
            const targetNum = findTargetNum(evt.args?.actorId);
            if (targetNum !== -1) {
              defs += `#define ACTOR_SCENE_${sceneNum}_${actorNum}_SHOW_ACTOR_${targetNum} 1\n`;
            }
          } else if (evt.command === "EVENT_ACTOR_HIDE") {
            const targetNum = findTargetNum(evt.args?.actorId);
            if (targetNum !== -1) {
              defs += `#define ACTOR_SCENE_${sceneNum}_${actorNum}_HIDE_ACTOR_${targetNum} 1\n`;
            }
          }
          if (evt.children && typeof evt.children === "object") {
            Object.values(evt.children).forEach((childEvts: any) => scanEvents(childEvts));
          }
          if (evt.true && Array.isArray(evt.true)) scanEvents(evt.true);
          if (evt.false && Array.isArray(evt.false)) scanEvents(evt.false);
        }
      }
    };

    scanEvents(scActor.script);
    return defs;
  }

  // Dynamic actors processing for all scenes
  let actorDirectives = "";
  let actorDefines = "";

  allScenes.forEach((scene: any, sceneIdx: number) => {
    const sceneNum = sceneIdx + 1;
    const sceneActors = scene.actors || [];

    const isPlayerHidden = checkActorHiddenState(scene, "player", true);
    if (isPlayerHidden) {
      actorDefines += `#define ACTOR_SCENE_${sceneNum}_PLAYER_HIDDEN 1\n`;
    }

    sceneActors.forEach((scActor: any, aIdx: number) => {
      const actorNum = aIdx + 1;
      let sprFilename = "actor_animated.png";
      let sprObj: any = null;
      if (scActor.spriteSheetId && allSprites.length > 0) {
        sprObj = allSprites.find((s: any) => s.id === scActor.spriteSheetId);
        if (sprObj?.filename) sprFilename = String(sprObj.filename);
      }

      const srcPng = pathModule.join(projectSpritesDir, sprFilename);
      const destPcx = pathModule.join(destSpritesDir, sprFilename.replace(/\.png$/i, `_sc${sceneNum}_${actorNum}.pcx`));
      try {
        let cropX = 0;
        let cropY = 0;
        let cropW = 16;
        let cropH = 16;
        let w16 = 1;
        let h16 = 1;

        if (sprObj) {
          const canvasW = sprObj.canvasWidth || 16;
          const canvasH = sprObj.canvasHeight || 16;
          cropW = canvasW;
          cropH = canvasH;
          w16 = Math.max(1, Math.min(2, Math.ceil(canvasW / 16)));
          h16 = Math.max(1, Math.min(2, Math.ceil(canvasH / 16)));
          cropX = getCropXForActor(scActor, sprObj, canvasW);
        } else {
          cropX = getCropXForActor(scActor, null, 16);
        }

        const dims = convertPngToPcx(srcPng, destPcx, { cropX, cropY, cropW, cropH });
        w16 = Math.max(1, Math.min(2, Math.ceil(dims.width / 16)));
        h16 = Math.max(1, Math.min(2, Math.ceil(dims.height / 16)));

        const vramSizeHex = `0x${((w16 * h16) * 0x40).toString(16).toUpperCase()}`;
        let sprSizeConst = "SZ_16x16";
        if (w16 === 1 && h16 === 2) sprSizeConst = "SZ_16x32";
        else if (w16 === 2 && h16 === 1) sprSizeConst = "SZ_32x16";
        else if (w16 === 2 && h16 === 2) sprSizeConst = "SZ_32x32";

        const relPcx = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcx).replace(/\\/g, "/")}`;
        actorDirectives += `#incspr(actor_sc${sceneNum}_${actorNum}_spr, "${relPcx}", 0, 0, ${w16}, ${h16})\n#incpal(actor_sc${sceneNum}_${actorNum}_pal, "${relPcx}")\n`;

        if (aIdx === 0) {
          actorDirectives += `#incspr(actor_sc${sceneNum}_spr, "${relPcx}", 0, 0, ${w16}, ${h16})\n#incpal(actor_sc${sceneNum}_pal, "${relPcx}")\n`;
        }

        const actX = parseCoord(scActor.x, 8);
        const actY = parseCoord(scActor.y, 12) - (h16 * 16) + 8;
        let textDef = "";
        const actText = extractActorText(scActor);
        if (actText) {
          const cleanText = actText.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
          textDef = `#define ACTOR_SCENE_${sceneNum}_${actorNum}_TEXT "${cleanText}"\n`;
          if (aIdx === 0) textDef += `#define ACTOR_SCENE_${sceneNum}_TEXT "${cleanText}"\n`;
        }

        const isActorHidden = checkActorHiddenState(scene, scActor.id, false);
        let hiddenDef = "";
        if (isActorHidden) {
          hiddenDef = `#define ACTOR_SCENE_${sceneNum}_${actorNum}_HIDDEN 1\n`;
          if (aIdx === 0) {
            hiddenDef += `#define ACTOR_SCENE_${sceneNum}_HIDDEN 1\n`;
          }
        }

        const interactDefs = getInteractionDefines(scene, scActor, sceneNum, actorNum);

        actorDefines += `#define HAS_ACTOR_SCENE_${sceneNum}_${actorNum} 1\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_X ${actX}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_Y ${actY}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_VRAM_SIZE ${vramSizeHex}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_SPRITE_SIZE ${sprSizeConst}\n${textDef}${hiddenDef}${interactDefs}`;

        if (aIdx === 0) {
          actorDefines += `#define HAS_ACTOR_SCENE_${sceneNum} 1\n#define ACTOR_SCENE_${sceneNum}_X ${actX}\n#define ACTOR_SCENE_${sceneNum}_Y ${actY}\n#define ACTOR_SCENE_${sceneNum}_VRAM_SIZE ${vramSizeHex}\n#define ACTOR_SCENE_${sceneNum}_SPRITE_SIZE ${sprSizeConst}\n`;
        }
      } catch (e) {
        console.error(`Error processing Scene ${sceneNum} actor ${actorNum} sprite:`, e);
      }
    });
  });

  // Resolve Triggers
  const triggerRows: string[] = [];
  allScenes.forEach((scene: any, sceneIdx: number) => {
    const sceneNum = sceneIdx + 1;
    const sceneTriggers = scene.triggers || [];

    sceneTriggers.forEach((tr: any) => {
      let targetScene = sceneNum === 1 ? 2 : 1;
      let targetX = 16 * 8;
      let targetY = (16 * 8) - (playerSprHeight16 * 16) + 8;

      if (tr.script && tr.script.length > 0) {
        const switchCmd = tr.script.find((c: any) => c.command === "EVENT_SWITCH_SCENE");
        if (switchCmd && switchCmd.args) {
          if (switchCmd.args.sceneId && sceneIdToNum[switchCmd.args.sceneId]) {
            targetScene = sceneIdToNum[switchCmd.args.sceneId];
          }
          const rawX = parseCoord(switchCmd.args.x, 16) / 8;
          const rawY = parseCoord(switchCmd.args.y, 16) / 8;
          targetX = rawX * 8;
          targetY = (rawY * 8) - (playerSprHeight16 * 16) + 8;
        }
      }

      const tx = parseCoord(tr.x, 0);
      const ty = parseCoord(tr.y, 0);
      const tw = parseCoord(tr.width, 2);
      const th = parseCoord(tr.height, 2);

      triggerRows.push(`  ${sceneNum}, ${tx}, ${ty}, ${tw}, ${th}, ${targetScene}, ${targetX}, ${targetY}`);
    });
  });

  let triggerDefines = "";
  if (triggerRows.length > 0) {
    triggerDefines = `#define HAS_TRIGGER_TABLE 1\n#define TRIGGER_COUNT ${triggerRows.length}\nconst int g_trigger_table[] = {\n${triggerRows.join(",\n")}\n};\n`;
  }

  // Look for music tracks (.uge files) and build symbol mapping BEFORE processing scene steps
  let musicIncludes = "";
  let hasMusicDef = "";
  let startMusicDef = "";
  const musicIdMap: Record<string, { filename: string; symbol: string }> = {};
  const musicByFilenameMap: Record<string, { id: string; symbol: string }> = {};
  const musicBySymbolMap: Record<string, { id: string; filename: string }> = {};
  const projectMusicDir = pathModule.join(projDir, "assets", "music");
  const projectMusicResDir = pathModule.join(projDir, "project", "music");
  const musicDirsToScan = [projectMusicResDir, projectMusicDir];

  const musicFromGbsres: any[] = [];
  for (const mDir of musicDirsToScan) {
    if (fs.existsSync(mDir)) {
      const gbsFiles = fs.readdirSync(mDir).filter((f: any) => typeof f === "string" && f.endsWith(".gbsres"));
      for (const gf of gbsFiles) {
        try {
          const json = fs.readJsonSync(pathModule.join(mDir, gf));
          if (json && json.id && json.filename) {
            musicFromGbsres.push(json);
          }
        } catch (e) { }
      }
    }
  }

  const allMusic = [...(projectData.music || []), ...musicFromGbsres];
  const usedSymbols = new Set<string>();

  allMusic.forEach((m: any, idx: number) => {
    if (m && m.id) {
      const fn = m.filename || (m.name ? (m.name.endsWith(".uge") ? m.name : `${m.name}.uge`) : "");
      if (fn) {
        let sym = m.symbol;
        if (!sym || usedSymbols.has(sym)) {
          const cleanName = (m.name || fn.replace(/\.uge$/i, "") || `song_${idx}`).replace(/[^a-zA-Z0-9_]/g, "_");
          sym = cleanName.startsWith("song_") ? cleanName : `song_${cleanName}`;
          if (usedSymbols.has(sym)) {
            sym = `${sym}_${idx}`;
          }
        }
        usedSymbols.add(sym);
        const info = { filename: fn, symbol: sym };
        musicIdMap[m.id] = info;
        musicByFilenameMap[fn] = { id: m.id, symbol: sym };
        const fnNoExt = fn.replace(/\.uge$/i, "");
        musicByFilenameMap[fnNoExt] = { id: m.id, symbol: sym };
        musicBySymbolMap[sym] = { id: m.id, filename: fn };
      }
    }
  });

  const compiledTrackSymbols: string[] = [];
  const compiledFiles = new Set<string>();

  const compileUgeTrack = async (ugePath: string, symbol: string) => {
    if (compiledFiles.has(ugePath)) return;
    compiledFiles.add(ugePath);
    try {
      const { loadUGESong, exportToC } = require("shared/lib/uge/ugeHelper");
      const ugeBuf = await fs.readFile(ugePath);
      const song = loadUGESong(ugeBuf);
      if (song) {
        const musicC = exportToC(song, symbol);
        const musicOutDir = pathModule.join(buildDir, "music");
        await fs.ensureDir(musicOutDir);
        await fs.writeFile(pathModule.join(musicOutDir, `${symbol}.c`), musicC, "utf8");
        musicIncludes += `#include "music/${symbol}.c"\n`;
        hasMusicDef = `#define HAS_MUSIC_DATA 1\n`;
        compiledTrackSymbols.push(symbol);
      }
    } catch (e) {
      console.error(`Error processing UGE music file ${ugePath}:`, e);
    }
  };

  // Collect all music IDs actually used in scenes and events
  const usedMusicIds = new Set<string>();
  if (activeStartScene && activeStartScene.musicId) {
    usedMusicIds.add(activeStartScene.musicId);
  }
  for (const sc of allScenes) {
    if (sc.musicId) usedMusicIds.add(sc.musicId);
    const events = [
      ...(Array.isArray(sc.script) ? sc.script : []),
      ...(Array.isArray(sc.startScript) ? sc.startScript : [])
    ];
    const checkEvts = (evts: any[]) => {
      if (!Array.isArray(evts)) return;
      for (const evt of evts) {
        if (evt && (evt.command === "EVENT_MUSIC_PLAY" || evt.command === "EVENT_PLAY_MUSIC")) {
          const mId = evt.args?.musicId || evt.args?.music;
          if (mId && mId !== "LAST_MUSIC") {
            usedMusicIds.add(mId);
          }
        }
        if (evt?.children && typeof evt.children === "object") {
          Object.values(evt.children).forEach((cEvts: any) => checkEvts(cEvts));
        }
        if (evt?.true && Array.isArray(evt.true)) checkEvts(evt.true);
        if (evt?.false && Array.isArray(evt.false)) checkEvts(evt.false);
      }
    };
    checkEvts(events);
  }

  // Compile used music tracks (or fallback to first available if none specified)
  const targetMusicKeys = Array.from(usedMusicIds);
  if (targetMusicKeys.length > 0) {
    for (const mId of targetMusicKeys) {
      let info = musicIdMap[mId];
      if (!info && musicByFilenameMap[mId]) info = musicByFilenameMap[mId];
      if (info) {
        let fn = info.filename;
        if (!fn.endsWith(".uge")) fn += ".uge";
        for (const mDir of musicDirsToScan) {
          const p = pathModule.join(mDir, fn);
          if (fs.existsSync(p)) {
            await compileUgeTrack(p, info.symbol);
            break;
          }
        }
      } else {
        let fn = mId.endsWith(".uge") ? mId : `${mId}.uge`;
        for (const mDir of musicDirsToScan) {
          const p = pathModule.join(mDir, fn);
          if (fs.existsSync(p)) {
            const sym = musicByFilenameMap[fn]?.symbol || `song_${compiledTrackSymbols.length}`;
            await compileUgeTrack(p, sym);
            break;
          }
        }
      }
    }
  }

  // Fallback scan for at least one .uge file if no tracks were compiled yet
  if (compiledTrackSymbols.length === 0) {
    for (const mDir of musicDirsToScan) {
      if (fs.existsSync(mDir)) {
        const ugeFiles = fs.readdirSync(mDir).filter((f: any) => typeof f === "string" && f.endsWith(".uge"));
        if (ugeFiles.length > 0) {
          const p = pathModule.join(mDir, ugeFiles[0]);
          const fn = ugeFiles[0];
          const sym = musicByFilenameMap[fn]?.symbol || `song_0`;
          await compileUgeTrack(p, sym);
          break;
        }
      }
    }
  }

  if (activeStartScene && activeStartScene.musicId && musicIdMap[activeStartScene.musicId]) {
    const startSym = musicIdMap[activeStartScene.musicId].symbol;
    if (compiledTrackSymbols.includes(startSym)) {
      startMusicDef = `#define START_MUSIC_DATA ${startSym}_Data\n`;
    }
  }

  // Dynamic scene step runner generation for ALL scenes in allScenes
  let sceneStepHelpers = "";
  let sceneInitCases = "";
  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const events = [
      ...(Array.isArray(scene.script) ? scene.script : []),
      ...(Array.isArray(scene.startScript) ? scene.startScript : [])
    ];

    const findTargetNum = (actArg: string): number => {
      if (actArg === "player" || actArg === "$self$") return 0;
      const targetIdx = (scene.actors || []).findIndex((a: any) => a.id === actArg);
      if (targetIdx !== -1) return targetIdx + 1;
      return 0;
    };

    let stepIndex = 0;
    let stepCases = "";

    const processEventList = (evts: any[]) => {
      if (!Array.isArray(evts)) return;
      for (const evt of evts) {
        if (!evt || typeof evt !== "object" || evt.args?.__comment) continue;

        if (evt.command === "EVENT_TEXT" || evt.command === "EVENT_TEXT_DIALOGUE" || evt.command === "EVENT_DISPLAY_TEXT") {
          let textVal = "";
          if (typeof evt.args?.text === "string") {
            textVal = evt.args.text;
          } else if (Array.isArray(evt.args?.text)) {
            textVal = evt.args.text.join("\n");
          }
          if (textVal) {
            const escaped = textVal.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
            stepCases += `      case ${stepIndex}:\n        show_dialogue("${escaped}");\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          }
        } else if (evt.command === "EVENT_WAIT") {
          let seconds = 1;
          if (typeof evt.args?.time === "number") seconds = evt.args.time;
          else if (typeof evt.args?.time === "object" && evt.args?.time?.value !== undefined) seconds = Number(evt.args.time.value);
          const frames = Math.max(1, Math.round(seconds * 60));
          stepCases += `      case ${stepIndex}:\n        g_wait_timer = ${frames};\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_CAMERA_SHAKE") {
          let seconds = 0.5;
          if (typeof evt.args?.time === "number") seconds = evt.args.time;
          else if (typeof evt.args?.time === "object" && evt.args?.time?.value !== undefined) seconds = Number(evt.args.time.value);
          let mag = 5;
          if (typeof evt.args?.magnitude === "number") mag = evt.args.magnitude;
          const frames = Math.max(1, Math.round(seconds * 60));
          stepCases += `      case ${stepIndex}:\n        camera_shake(${frames}, ${mag});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_SWITCH_SCENE") {
          let targetScene = 1;
          if (evt.args?.sceneId && sceneIdToNum[evt.args.sceneId]) {
            targetScene = sceneIdToNum[evt.args.sceneId];
          }
          let rawX = 0;
          let rawY = 0;
          if (typeof evt.args?.x === "number") rawX = evt.args.x;
          else if (typeof evt.args?.x === "object" && evt.args?.x?.value !== undefined) rawX = Number(evt.args.x.value);
          if (typeof evt.args?.y === "number") rawY = evt.args.y;
          else if (typeof evt.args?.y === "object" && evt.args?.y?.value !== undefined) rawY = Number(evt.args.y.value);

          stepCases += `      case ${stepIndex}:\n        load_scene(${targetScene}, ${rawX * 8}, ${(rawY * 8) - (playerSprHeight16 * 16) + 8});\n        return -1;\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_MUSIC_PLAY" || evt.command === "EVENT_PLAY_MUSIC") {
          const musicId = evt.args?.musicId || evt.args?.music;
          let songSymbol = "";
          if (musicId && musicIdMap[musicId]) {
            songSymbol = musicIdMap[musicId].symbol;
          } else if (musicId && musicByFilenameMap[musicId]) {
            songSymbol = musicByFilenameMap[musicId].symbol;
          } else if (musicId && musicBySymbolMap[musicId]) {
            songSymbol = musicId;
          } else if (scene.musicId && musicIdMap[scene.musicId]) {
            songSymbol = musicIdMap[scene.musicId].symbol;
          } else if (compiledTrackSymbols.length > 0) {
            songSymbol = compiledTrackSymbols[0];
          } else {
            songSymbol = "song_0";
          }
          stepCases += `      case ${stepIndex}:\n#ifdef HAS_MUSIC_DATA\n        pce_sound_play(${songSymbol}_Data);\n#endif\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_SHOW") {
          const targetNum = findTargetNum(evt.args?.actorId);
          stepCases += `      case ${stepIndex}:\n        actor_show(${targetNum});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_HIDE") {
          const targetNum = findTargetNum(evt.args?.actorId);
          stepCases += `      case ${stepIndex}:\n        actor_hide(${targetNum});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_COLLISIONS_DISABLE") {
          const targetNum = findTargetNum(evt.args?.actorId);
          stepCases += `      case ${stepIndex}:\n        actor_set_collisions(${targetNum}, 0);\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_COLLISIONS_ENABLE") {
          const targetNum = findTargetNum(evt.args?.actorId);
          stepCases += `      case ${stepIndex}:\n        actor_set_collisions(${targetNum}, 1);\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_MOVE_TO" || evt.command === "EVENT_ACTOR_MOVE_TO_VALUE") {
          const targetNum = findTargetNum(evt.args?.actorId);
          const px = parseCoord(evt.args?.x, 0) * 8;
          const py = parseCoord(evt.args?.y, 0) * 8;
          stepCases += `      case ${stepIndex}:\n        actor_move_to(${targetNum}, ${px}, ${py});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_MOVE_RELATIVE") {
          const targetNum = findTargetNum(evt.args?.actorId);
          const dx = parseCoord(evt.args?.x, 0) * 8;
          const dy = parseCoord(evt.args?.y, 0) * 8;
          stepCases += `      case ${stepIndex}:\n        actor_set_pos_rel(${targetNum}, ${dx}, ${dy});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_SET_DIRECTION" || evt.command === "EVENT_ACTOR_SET_DIRECTION_TO_VALUE") {
          const targetNum = findTargetNum(evt.args?.actorId);
          const dStr = String(evt.args?.direction || "down").toLowerCase();
          let dNum = 0;
          if (dStr === "right") dNum = 1;
          else if (dStr === "up") dNum = 2;
          else if (dStr === "left") dNum = 3;
          stepCases += `      case ${stepIndex}:\n        actor_set_dir(${targetNum}, ${dNum});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_SET_MOVEMENT_SPEED") {
          const targetNum = findTargetNum(evt.args?.actorId);
          const spd = parseCoord(evt.args?.speed, 1);
          stepCases += `      case ${stepIndex}:\n        actor_set_move_speed(${targetNum}, ${spd});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_SET_ANIMATION_SPEED") {
          const targetNum = findTargetNum(evt.args?.actorId);
          const spd = parseCoord(evt.args?.speed, 1);
          stepCases += `      case ${stepIndex}:\n        actor_set_anim_speed(${targetNum}, ${spd});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_SET_FRAME" || evt.command === "EVENT_ACTOR_SET_FRAME_TO_VALUE") {
          const targetNum = findTargetNum(evt.args?.actorId);
          const frm = parseCoord(evt.args?.frame, 0);
          stepCases += `      case ${stepIndex}:\n        actor_set_frame(${targetNum}, ${frm});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_EMOTE") {
          const targetNum = findTargetNum(evt.args?.actorId);
          const emoteId = parseCoord(evt.args?.emoteId, 0);
          stepCases += `      case ${stepIndex}:\n        actor_emote(${targetNum}, ${emoteId});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_PUSH") {
          const targetNum = findTargetNum(evt.args?.actorId);
          const dStr = String(evt.args?.direction || "down").toLowerCase();
          let dNum = 0;
          if (dStr === "right") dNum = 1;
          else if (dStr === "up") dNum = 2;
          else if (dStr === "left") dNum = 3;
          stepCases += `      case ${stepIndex}:\n        actor_push(${targetNum}, ${dNum});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_CAMERA_MOVE_TO" || evt.command === "EVENT_CAMERA_SET_POSITION") {
          const cx = parseCoord(evt.args?.x, 0) * 8;
          const cy = parseCoord(evt.args?.y, 0) * 8;
          stepCases += `      case ${stepIndex}:\n        camera_update(${cx}, ${cy});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_AWAIT_INPUT") {
          stepCases += `      case ${stepIndex}:\n        g_wait_timer = 30;\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_CHOICE") {
          stepCases += `      case ${stepIndex}:\n        show_dialogue("Choice...");\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_DIALOGUE_CLOSE_NONMODAL") {
          stepCases += `      case ${stepIndex}:\n        hide_dialogue();\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_HIDE_SPRITES") {
          stepCases += `      case ${stepIndex}:\n        actor_hide_all();\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_MUSIC_STOP") {
          stepCases += `      case ${stepIndex}:\n        pce_sound_stop();\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_MENU") {
          stepCases += `      case ${stepIndex}:\n        show_dialogue("Menu...");\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (
          evt.command === "EVENT_LOAD_DATA" ||
          evt.command === "EVENT_LOAD_PROJECTILE_SLOT" ||
          evt.command === "EVENT_LOOP" ||
          evt.command === "EVENT_LOOP_FOR" ||
          evt.command === "EVENT_LOOP_WHILE" ||
          evt.command === "EVENT_LOOP_WHILE_EXPRESSION" ||
          evt.command === "EVENT_MATH_ADD" ||
          evt.command === "EVENT_MATH_ADD_VALUE" ||
          evt.command === "EVENT_MATH_DIV" ||
          evt.command === "EVENT_MATH_DIV_VALUE" ||
          evt.command === "EVENT_MATH_MOD" ||
          evt.command === "EVENT_MATH_MOD_VALUE" ||
          evt.command === "EVENT_MATH_MUL" ||
          evt.command === "EVENT_MATH_MUL_VALUE" ||
          evt.command === "EVENT_MATH_SUB" ||
          evt.command === "EVENT_MATH_SUB_VALUE" ||
          evt.command === "EVENT_MUTE_CHANNEL" ||
          evt.command === "EVENT_NOTES" ||
          evt.command === "EVENT_OVERLAY_HIDE" ||
          evt.command === "EVENT_OVERLAY_MOVE_TO" ||
          evt.command === "EVENT_OVERLAY_SET_SCANLINE_CUTOFF" ||
          evt.command === "EVENT_OVERLAY_SHOW" ||
          evt.command === "EVENT_PEEK_DATA" ||
          evt.command === "EVENT_PLATFORMER_DETACH_PLATFORM" ||
          evt.command === "EVENT_PLATFORMER_SET_STATE" ||
          evt.command === "EVENT_PLATFORMER_STATE_SET" ||
          evt.command === "EVENT_PLAYER_BOUNCE" ||
          evt.command === "EVENT_PLAYER_SET_SPRITE" ||
          evt.command === "EVENT_IDLE" ||
          evt.command === "EVENT_IF" ||
          evt.command === "EVENT_IF_ACTOR_AT_POSITION" ||
          evt.command === "EVENT_IF_ACTOR_DIRECTION" ||
          evt.command === "EVENT_IF_ACTOR_DISTANCE_FROM_ACTOR" ||
          evt.command === "EVENT_IF_ACTOR_RELATIVE_TO_ACTOR" ||
          evt.command === "EVENT_IF_COLOR_SUPPORTED" ||
          evt.command === "EVENT_IF_CURRENT_SCENE_IS" ||
          evt.command === "EVENT_IF_ENGINE_FIELD" ||
          evt.command === "EVENT_IF_ENGINE_FIELD_COMPARE" ||
          evt.command === "EVENT_IF_EXPRESSION" ||
          evt.command === "EVENT_IF_FALSE" ||
          evt.command === "EVENT_IF_FLAGS_COMPARE" ||
          evt.command === "EVENT_IF_INPUT" ||
          evt.command === "EVENT_IF_SAVED_DATA" ||
          evt.command === "EVENT_IF_TRUE" ||
          evt.command === "EVENT_IF_VALUE" ||
          evt.command === "EVENT_IF_VALUE_COMPARE" ||
          evt.command === "EVENT_INC_VALUE" ||
          evt.command === "EVENT_LAUNCH_PROJECTILE" ||
          evt.command === "EVENT_LAUNCH_PROJECTILE_SLOT" ||
          evt.command === "EVENT_ACTOR_EFFECTS" ||
          evt.command === "EVENT_ACTOR_MOVE_CANCEL" ||
          evt.command === "EVENT_ACTOR_GET_DIRECTION" ||
          evt.command === "EVENT_ACTOR_GET_POSITION" ||
          evt.command === "EVENT_ACTOR_SET_ANIMATE" ||
          evt.command === "EVENT_ACTOR_SET_SPRITE" ||
          evt.command === "EVENT_ACTOR_SET_STATE" ||
          evt.command === "EVENT_ACTOR_SET_COLLISION_BOX" ||
          evt.command === "EVENT_ACTOR_INVOKE" ||
          evt.command === "EVENT_ACTOR_START_UPDATE" ||
          evt.command === "EVENT_ACTOR_STOP_UPDATE" ||
          evt.command === "EVENT_ADD_FLAGS" ||
          evt.command === "EVENT_ADVENTURE_STATE_SET" ||
          evt.command === "EVENT_CALL_CUSTOM_EVENT" ||
          evt.command === "EVENT_CAMERA_LOCK" ||
          evt.command === "EVENT_CAMERA_PROPERTY_SET" ||
          evt.command === "EVENT_CAMERA_SET_BOUNDS" ||
          evt.command === "EVENT_CAMERA_SET_LOCK" ||
          evt.command === "EVENT_CLEAR_DATA" ||
          evt.command === "EVENT_CLEAR_FLAGS" ||
          evt.command === "EVENT_CODE" ||
          evt.command === "EVENT_COMMENT" ||
          evt.command === "EVENT_COPY_VALUE" ||
          evt.command === "EVENT_DATA_TABLE" ||
          evt.command === "EVENT_DEC_VALUE" ||
          evt.command === "EVENT_ENGINE_FIELD_SET" ||
          evt.command === "EVENT_ENGINE_FIELD_STORE" ||
          evt.command === "EVENT_FADE_IN" ||
          evt.command === "EVENT_FADE_OUT" ||
          evt.command === "EVENT_FADE_SETTINGS"
        ) {
          stepCases += `      case ${stepIndex}:\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        }

        if (evt.children && typeof evt.children === "object") {
          Object.values(evt.children).forEach((cEvts: any) => processEventList(cEvts));
        }
        if (evt.true && Array.isArray(evt.true)) processEventList(evt.true);
        if (evt.false && Array.isArray(evt.false)) processEventList(evt.false);
      }
    };

    processEventList(events);

    if (stepCases) {
      sceneStepHelpers += `int run_scene_${scNum}_step(int step) {\n  switch (step) {\n${stepCases}    default:\n      return -1;\n  }\n}\n\n`;
      sceneInitCases += `  if (scene_num == ${scNum}) return run_scene_${scNum}_step(step);\n`;
    }
  });

  let sceneMusicCases = "";
  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    if (scene.musicId && musicIdMap[scene.musicId] && compiledTrackSymbols.includes(musicIdMap[scene.musicId].symbol)) {
      const sym = musicIdMap[scene.musicId].symbol;
      sceneMusicCases += `    case ${scNum}:\n#ifdef HAS_MUSIC_DATA\n      pce_sound_play(${sym}_Data);\n#endif\n      break;\n`;
    } else {
      sceneMusicCases += `    case ${scNum}:\n      pce_sound_stop();\n      break;\n`;
    }
  });

  const sceneInitFunctionC = `#define HAS_SCENE_STEP_EVENTS 1\n${sceneStepHelpers}int run_scene_step(int scene_num, int step) {\n${sceneInitCases}  return -1;\n}\n\nvoid load_scene_music(int scene_num) {\n  switch (scene_num) {\n${sceneMusicCases}    default:\n      pce_sound_stop();\n      break;\n  }\n}\n`;

  let playerSprVramSizeHex = "0x40";
  let playerSprSizeConst = "SZ_16x16";
  if (playerSprWidth16 === 1 && playerSprHeight16 === 2) {
    playerSprVramSizeHex = "0x80";
    playerSprSizeConst = "SZ_16x32";
  } else if (playerSprWidth16 === 2 && playerSprHeight16 === 1) {
    playerSprVramSizeHex = "0x80";
    playerSprSizeConst = "SZ_32x16";
  } else if (playerSprWidth16 === 2 && playerSprHeight16 === 2) {
    playerSprVramSizeHex = "0x100";
    playerSprSizeConst = "SZ_32x32";
  }

  const mainCContent = `
#include <huc.h>

/* Scene type: must be defined BEFORE including engine.h */
${sceneTypeDefine}
#include "include/engine.h"

#incspr(player_spr_r0, "${playerPcxRelativePathR0}", 0, 0, ${playerSprWidth16}, ${playerSprHeight16})
#incpal(player_pal, "${playerPcxRelativePathR0}")
#incspr(player_spr_l0, "${playerPcxRelativePathL0}", 0, 0, ${playerSprWidth16}, ${playerSprHeight16})
${hasPlayerFrame1 ? `#incspr(player_spr_r1, "${playerPcxRelativePathR1}", 0, 0, ${playerSprWidth16}, ${playerSprHeight16})\n#incspr(player_spr_l1, "${playerPcxRelativePathL1}", 0, 0, ${playerSprWidth16}, ${playerSprHeight16})\n#define HAS_PLAYER_FRAME_1 1\n` : ""}

${bgDirectives}

${actorDirectives}

#define START_SCENE_NUM ${startSceneNum}
#define PLAYER_START_X ${playerStartX}
#define PLAYER_START_Y ${playerStartY}
#define PLAYER_SPR_VRAM_SIZE ${playerSprVramSizeHex}
#define PLAYER_SPR_SIZE ${playerSprSizeConst}
${hasMusicDef}${startMusicDef}

${actorDefines}
${triggerDefines}

${collisionIncludes}
#include "src/pce_system.c"
#include "src/pce_sound.c"
${musicIncludes}
#include "src/actor.c"
#include "src/camera.c"
#include "src/collision.c"
#include "src/trigger.c"
#include "src/vm.c"

${sceneInitFunctionC}

#include "src/engine.c"

main() {
    engine_run();
}
`;

  const mainCPath = pathModule.join(buildDir, "main.c");
  await fs.writeFile(mainCPath, mainCContent);

  const makeBuildModule = require("./makeBuild");
  const makeBuildFn = makeBuildModule.default || makeBuildModule.makeBuild || makeBuildModule;
  const defaultRomName = (projectData.name || pathModule.basename(projDir) || "game").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const romFilename = (typeof outputBuildDir === "object" && outputBuildDir?.romFilename)
    ? outputBuildDir.romFilename
    : (projectData.settings?.romFilename ? `${projectData.settings.romFilename}.pce` : `${defaultRomName || "game"}.pce`);

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
