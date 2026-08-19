import fs from "fs-extra";
import Path from "path";
import { convertPngToPcx, buildPngPalette } from "./convertPngToPcx";
import convertToIndexedPngDefault, { convertToIndexedPng as convertToIndexedPngFn, createBlankIndexedPng } from "./indexedPngWriter";

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
  } else if (outputBuildDir?.projectRoot) {
    projDir = outputBuildDir.projectRoot;
  } else if (projectDirPath?.projectRoot) {
    projDir = projectDirPath.projectRoot;
  } else if (projectDirPath?.path) {
    projDir = projectDirPath.path;
  } else if (projectDirPath?.dir) {
    projDir = projectDirPath.dir;
  } else {
    projDir = process.cwd();
  }

  if (projDir && (projDir.endsWith(".gbsproj") || projDir.endsWith(".json"))) {
    projDir = pathModule.dirname(projDir);
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
      const engineSrc = pathModule.join(defaultEngineRoot, "src");
      const engineInclude = pathModule.join(defaultEngineRoot, "include");
      if (fs.existsSync(engineSrc)) {
        await fs.copy(engineSrc, pathModule.join(buildDir, "src"), { overwrite: true, errorOnExist: false });
      }
      if (fs.existsSync(engineInclude)) {
        await fs.copy(engineInclude, pathModule.join(buildDir, "include"), { overwrite: true, errorOnExist: false });
      }
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
            if (!json.filename) {
              json.filename = gf.replace(/\.gbsres$/i, "");
            }
            spritesFromGbsres.push(json);
          }
        } catch (e) { }
      }
    }
  }

  const toEntityArray = (val: any): any[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (val.entities && typeof val.entities === "object") {
      if (Array.isArray(val.ids)) {
        return val.ids.map((id: string) => val.entities[id]).filter(Boolean);
      }
      return Object.values(val.entities);
    }
    if (typeof val === "object") {
      return Object.values(val);
    }
    return [];
  };

  const projectSpritesArr = toEntityArray(projectData.sprites);
  const allSprites = [...spritesFromGbsres, ...projectSpritesArr];

  // Parse scene and actor gbsres files
  let scenesFromGbsres: any[] = [];
  const scenesDir = pathModule.join(projDir, "project", "scenes");
  if (fs.existsSync(scenesDir)) {
    const sceneDirs = fs.readdirSync(scenesDir);
    for (const sd of sceneDirs) {
      const sceneGbs = pathModule.join(scenesDir, String(sd), "scene.gbsres");
      if (fs.existsSync(sceneGbs)) {
        try {
          const json = fs.readJsonSync(sceneGbs);
          if (json) {
            const actorsDir = pathModule.join(scenesDir, String(sd), "actors");
            if (fs.existsSync(actorsDir)) {
              const actorFiles = fs.readdirSync(actorsDir).filter(f => typeof f === "string" && f.endsWith(".gbsres"));
              const sceneActors: any[] = [];
              for (const af of actorFiles) {
                try {
                  const aJson = fs.readJsonSync(pathModule.join(actorsDir, af));
                  if (aJson) sceneActors.push(aJson);
                } catch (e) { }
              }
              json.actors = sceneActors;
            }
            const triggersDir = pathModule.join(scenesDir, String(sd), "triggers");
            if (fs.existsSync(triggersDir)) {
              const trigFiles = fs.readdirSync(triggersDir).filter(f => typeof f === "string" && f.endsWith(".gbsres"));
              const sceneTriggers: any[] = [];
              for (const tf of trigFiles) {
                try {
                  const tJson = fs.readJsonSync(pathModule.join(triggersDir, tf));
                  if (tJson) sceneTriggers.push(tJson);
                } catch (e) { }
              }
              json.triggers = sceneTriggers;
            }
            scenesFromGbsres.push(json);
          }
        } catch (e) { }
      }
    }
  }

  if (projectData.sceneOrder && Array.isArray(projectData.sceneOrder)) {
    const sceneMap = new Map<string, any>();
    scenesFromGbsres.forEach((sc) => {
      if (sc.id) sceneMap.set(sc.id, sc);
    });
    const orderedScenes: any[] = [];
    projectData.sceneOrder.forEach((id: string) => {
      if (sceneMap.has(id)) {
        orderedScenes.push(sceneMap.get(id));
        sceneMap.delete(id);
      }
    });
    sceneMap.forEach((sc) => orderedScenes.push(sc));
    if (orderedScenes.length > 0) {
      scenesFromGbsres = orderedScenes;
    }
  } else if (settingsGbsData && Array.isArray(settingsGbsData.sceneIds) && scenesFromGbsres.length > 0) {
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
      const idxA = a._index !== undefined ? Number(a._index) : 999;
      const idxB = b._index !== undefined ? Number(b._index) : 999;
      if (idxA !== idxB) return idxA - idxB;
      const numA = parseInt((a.name || "").replace(/\D/g, "")) || 0;
      const numB = parseInt((b.name || "").replace(/\D/g, "")) || 0;
      if (numA && numB) return numA - numB;
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  const projectScenesArr = toEntityArray(projectData.scenes);
  const allScenes = (projectScenesArr.length > 0)
    ? projectScenesArr
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

  const projectBgArr = toEntityArray(projectData.backgrounds);
  const allBackgrounds = [...projectBgArr, ...bgsFromGbsres];
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

  // Load platformer settings from projectData and project/engine_field_values.gbsres if present
  let engineFieldValuesMap: Record<string, any> = {};
  if (projectData && projectData.engineFieldValues) {
    const efList = Array.isArray(projectData.engineFieldValues)
      ? projectData.engineFieldValues
      : Object.entries(projectData.engineFieldValues).map(([id, value]) => ({ id, value }));
    for (const ef of efList) {
      if (ef && ef.id) {
        engineFieldValuesMap[ef.id] = ef.value;
      }
    }
  }
  const engineFieldsGbsPath = pathModule.join(projDir, "project", "engine_field_values.gbsres");
  if (fs.existsSync(engineFieldsGbsPath)) {
    try {
      const efJson = fs.readJsonSync(engineFieldsGbsPath);
      if (efJson && Array.isArray(efJson.engineFieldValues)) {
        for (const ef of efJson.engineFieldValues) {
          if (ef && ef.id && engineFieldValuesMap[ef.id] === undefined) {
            engineFieldValuesMap[ef.id] = ef.value;
          }
        }
      }
    } catch (e) { }
  }

  const rawWalkVel = typeof engineFieldValuesMap["plat_walk_vel"] === "number" ? engineFieldValuesMap["plat_walk_vel"] : 6400;
  const rawGrav = typeof engineFieldValuesMap["plat_grav"] === "number" ? engineFieldValuesMap["plat_grav"] : 1024;
  const rawHoldGrav = typeof engineFieldValuesMap["plat_hold_grav"] === "number" ? engineFieldValuesMap["plat_hold_grav"] : 512;
  const rawMaxFall = typeof engineFieldValuesMap["plat_max_fall_vel"] === "number" ? engineFieldValuesMap["plat_max_fall_vel"] : 20000;
  const rawJumpVel = typeof engineFieldValuesMap["plat_jump_vel"] === "number" ? engineFieldValuesMap["plat_jump_vel"] : 16384;

  // Convert 16-bit fixed point engine field values to PC Engine subpixels (8 subpixels = 1 pixel)
  // 1 PPF in GBS = 4096 -> 8 subpixels in PCE (divide by 512)
  const platWalkSubpx = Math.max(1, Math.round(rawWalkVel / 512));
  const platGravitySubpx = Math.max(1, Math.round(rawGrav / 512));
  const platHoldGravitySubpx = Math.max(1, Math.round(rawHoldGrav / 512));
  const platMaxFallSubpx = Math.max(4, Math.round(rawMaxFall / 512));
  const platJumpVelSubpx = Math.max(8, Math.round(rawJumpVel / 512));

  let platJumpBtnDefine = "(JOY_I | JOY_A | JOY_II | JOY_B)";
  const jumpBtnVal = String(engineFieldValuesMap["plat_jump_btn"] || engineFieldValuesMap["jump_btn"] || "").toUpperCase();
  if (jumpBtnVal.includes("UP")) {
    platJumpBtnDefine = "JOY_UP";
  } else if (jumpBtnVal.includes("B") || jumpBtnVal.includes("II")) {
    platJumpBtnDefine = "(JOY_II | JOY_B)";
  } else if (jumpBtnVal.includes("A") || jumpBtnVal.includes("I")) {
    platJumpBtnDefine = "(JOY_I | JOY_A)";
  }

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

  const getPceScreenSize = (w: number, h: number) => {
    if (w <= 32 && h <= 32) return "SCR_SIZE_32x32";
    if (w <= 64 && h <= 32) return "SCR_SIZE_64x32";
    if (w <= 32 && h > 32) return "SCR_SIZE_32x64";
    if (w <= 64 && h > 32) return "SCR_SIZE_64x64";
    if (w > 64 && h <= 32) return "SCR_SIZE_128x32";
    return "SCR_SIZE_128x64";
  };

  const sceneDimensions: { width: number; height: number; scrSize: string }[] = [];

  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const bgFile = getSceneBgFilename(scene, idx);
    sceneBgFilenames.push(bgFile);

    let scWidth = Number(scene.width) || 32;
    let scHeight = Number(scene.height) || 28;

    if (scene.backgroundId) {
      const matchedBg = allBackgrounds.find((b: any) => b && (b.id === scene.backgroundId || b.name === scene.backgroundId || b.filename === scene.backgroundId || b.symbol === scene.backgroundId));
      if (matchedBg) {
        if (matchedBg.width) scWidth = Number(matchedBg.width);
        if (matchedBg.height) scHeight = Number(matchedBg.height);
      }
    }

    for (const bDir of bgDirsToScan) {
      const srcPng = pathModule.join(bDir, bgFile);
      if (fs.existsSync(srcPng)) {
        try {
          const buf = fs.readFileSync(srcPng);
          if (buf.length >= 24) {
            const pngW = buf.readUInt32BE(16) >> 3;
            const pngH = buf.readUInt32BE(20) >> 3;
            // Use the actual PNG pixel dimensions as ground truth.
            // Math.max was causing scenes with height:32 to generate
            // .incchr with 32 tile rows even when the PNG is only 28
            // tiles tall (224px), triggering "Coordinates out of range!"
            if (pngW > 0) scWidth = pngW;
            if (pngH > 0) scHeight = pngH;
          }
        } catch (e) {}
        break;
      }
    }

    scWidth = Math.min(128, scWidth);
    scHeight = Math.min(64, scHeight);
    if (scWidth * scHeight > 2048) {
      scWidth = Math.min(scWidth, Math.floor(2048 / scHeight));
    }

    const scrSize = getPceScreenSize(scWidth, scHeight);
    sceneDimensions.push({ width: scWidth, height: scHeight, scrSize });

    const scType: string = (scene.type || "TOPDOWN").toUpperCase();
    const scTypeNum = SCENE_TYPE_MAP[scType] ?? SCENE_TYPE_MAP["TOPDOWN"];
    sceneTypeDefineList.push(`#define SCENE_${scNum}_TYPE ${scTypeNum}`);
    sceneTypeDefineList.push(`#define SCENE_${scNum}_WIDTH ${scWidth}`);
    sceneTypeDefineList.push(`#define SCENE_${scNum}_HEIGHT ${scHeight}`);
    sceneTypeDefineList.push(`#define SCENE_${scNum}_SCR_SIZE ${scrSize}`);
    sceneTypeDefineList.push(`#define HAS_SCENE_${scNum} 1`);
  });

  const firstType = (allScenes[0]?.type || "TOPDOWN").toUpperCase();
  const firstTypeNum = SCENE_TYPE_MAP[firstType] ?? SCENE_TYPE_MAP["TOPDOWN"];
  const sceneTypeDefine = sceneTypeDefineList.join("\n") + `\n#define SCENE_TYPE ${firstTypeNum}\n#define PLAT_WALK_SUBPX ${platWalkSubpx}\n#define PLAT_GRAVITY ${platGravitySubpx}\n#define PLAT_HOLD_GRAVITY ${platHoldGravitySubpx}\n#define PLAT_JUMP_SUBPX ${platJumpVelSubpx}\n#define PLAT_MAX_FALL ${platMaxFallSubpx}\n#define PLAT_JUMP_BTN ${platJumpBtnDefine}\n`;

  // Ensure background PNGs exist in build assets/backgrounds directory
  const destBgDir = pathModule.join(buildDir, "assets", "backgrounds");
  await fs.ensureDir(destBgDir);

  const uniqueBgFiles = Array.from(new Set(sceneBgFilenames));
  for (const bgFile of uniqueBgFiles) {
    let copied = false;
    for (const bDir of bgDirsToScan) {
      const srcPng = pathModule.join(bDir, bgFile);
      if (fs.existsSync(srcPng)) {
        const destPng = pathModule.join(destBgDir, bgFile);
        try {
          convertToIndexedPng(srcPng, destPng);
        } catch (e) {
          await fs.copy(srcPng, destPng, { overwrite: true });
        }
        copied = true;
        break;
      }
    }
    if (!copied) {
      const destPng = pathModule.join(destBgDir, bgFile);
      if (!fs.existsSync(destPng)) {
        let fallbackSrc = "";
        for (const bDir of bgDirsToScan) {
          if (fs.existsSync(bDir)) {
            const pngs = fs.readdirSync(bDir).filter((f: any) => typeof f === "string" && f.endsWith(".png"));
            if (pngs.length > 0) {
              fallbackSrc = pathModule.join(bDir, pngs[0]);
              break;
            }
          }
        }
        if (fallbackSrc && fs.existsSync(fallbackSrc)) {
          try {
            convertToIndexedPng(fallbackSrc, destPng);
          } catch (e) {
            await fs.copy(fallbackSrc, destPng, { overwrite: true });
          }
        } else {
          try {
            createBlankIndexedPng(destPng, 256, 224);
          } catch (e) {}
        }
      }
    }
  }

  const defaultScenePng = pathModule.join(destBgDir, "scene.png");
  if (!fs.existsSync(defaultScenePng)) {
    try {
      createBlankIndexedPng(defaultScenePng, 256, 224);
    } catch (e) {}
  }

  let bgAsmDirectives = "";
  const bgSymbolMap = new Map<string, string>();
  let bgUniqueIndex = 0;

  sceneBgFilenames.forEach((bgFile, idx) => {
    const scNum = idx + 1;
    const dim = sceneDimensions[idx] || { width: 32, height: 28 };
    const key = `${bgFile}|${dim.width}|${dim.height}`;

    if (!bgSymbolMap.has(key)) {
      const symPrefix = `bg_file_${bgUniqueIndex++}`;
      bgSymbolMap.set(key, symPrefix);
      bgAsmDirectives += `_${symPrefix}_chr .incchr "assets/backgrounds/${bgFile}",0,0,${dim.width},${dim.height},1\n`;
      bgAsmDirectives += `_${symPrefix}_pal .incpal "assets/backgrounds/${bgFile}"\n`;
      bgAsmDirectives += `_${symPrefix}_bat .incbat "assets/backgrounds/${bgFile}",$1000,0,0,${dim.width},${dim.height},_${symPrefix}_chr\n`;
    }

    const symPrefix = bgSymbolMap.get(key)!;
    bgAsmDirectives += `_bg_scene${scNum}_chr = _${symPrefix}_chr\n`;
    bgAsmDirectives += `_bg_scene${scNum}_pal = _${symPrefix}_pal\n`;
    bgAsmDirectives += `_bg_scene${scNum}_bat = _${symPrefix}_bat\n`;
  });

  const bgDirectives = `#asm\n .data\n${bgAsmDirectives} .code\n#endasm\n`;

  let collisionIncludes = "";
  const colSymbolMap = new Map<string, string>();
  let colUniqueIndex = 0;

  const decompress8bitNumberString = (str: string): number[] => {
    const arr: number[] = [];
    let i = 0;
    while (i < str.length) {
      const value = parseInt(str.slice(i, i + 2), 16);
      i += 2;
      let count = 1;
      if (i < str.length) {
        if (str[i] === "!") {
          count = 1;
          i++;
        } else {
          const countStart = i;
          const countEnd = str.indexOf("+", countStart);
          if (countStart === countEnd || countEnd === -1) {
            return [];
          }
          count = parseInt(str.slice(countStart, countEnd), 16);
          i = countEnd + 1;
        }
      } else {
        return [];
      }
      for (let j = 0; j < count; j++) {
        arr.push(value);
      }
    }
    return arr;
  };

  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const dim = sceneDimensions[idx] || { width: 32, height: 28 };
    const colFileName = `scene_${scNum}_collisions.bin`;
    const colFilePath = pathModule.join(buildDir, colFileName);

    let rawCollisions: number[] = [];
    if (scene.collisions) {
      if (typeof scene.collisions === "string") {
        rawCollisions = decompress8bitNumberString(scene.collisions);
      } else if (Array.isArray(scene.collisions)) {
        rawCollisions = scene.collisions;
      }
    }

    const origW = Number(scene.width) || dim.width;
    const origH = Number(scene.height) || dim.height;
    let colBytes = new Uint8Array(dim.width * dim.height);
    for (let y = 0; y < dim.height; y++) {
      for (let x = 0; x < dim.width; x++) {
        const dstIdx = y * dim.width + x;
        const srcIdx = y * origW + x;
        if (srcIdx < rawCollisions.length) {
          colBytes[dstIdx] = rawCollisions[srcIdx] ? 1 : 0;
        }
      }
    }

    fs.writeFileSync(colFilePath, Buffer.from(colBytes));

    const key = Array.from(colBytes).join(",");
    let symName = "";

    if (!colSymbolMap.has(key)) {
      symName = `col_data_${colUniqueIndex++}`;
      colSymbolMap.set(key, symName);
      collisionIncludes += `#incbin(${symName}, "${colFileName}")\n`;
      collisionIncludes += `#define scene_${scNum}_collisions ${symName}\n`;
    } else {
      symName = colSymbolMap.get(key)!;
      collisionIncludes += `#define scene_${scNum}_collisions ${symName}\n`;
    }

    collisionIncludes += `#define HAS_SCENE_${scNum}_COLLISIONS 1\n`;
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

  const requestedSceneNum = (typeof outputBuildDir === "object" && outputBuildDir?.sceneNum) ? outputBuildDir.sceneNum : ((typeof projectDirPath === "object" && projectDirPath?.sceneNum) ? projectDirPath.sceneNum : 0);
  let startSceneNum = requestedSceneNum ? requestedSceneNum : 1;
  if (!requestedSceneNum && startSceneId) {
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

  // Collect all unique player sprites
  const defaultPlayerSpriteSheetId = settingsGbsData?.playerSpriteSheetId || projectData?.settings?.playerSpriteSheetId;
  const uniquePlayerSpriteMap = new Map<string, any>();

  const registerPlayerSprite = (sheetId: string | undefined) => {
    const id = sheetId || defaultPlayerSpriteSheetId;
    if (!id || uniquePlayerSpriteMap.has(String(id))) return;
    let sprObj = allSprites.find((s: any) =>
      s.id === id ||
      s.name === id ||
      s.symbol === id ||
      s.filename === id
    );
    if (!sprObj && spritePngFiles.length > 0) {
      const matchName = spritePngFiles.find(f => f.toLowerCase().includes(String(id).toLowerCase()));
      if (matchName) sprObj = { filename: matchName, name: matchName.replace(/\.png$/i, "") };
    }
    if (sprObj?.filename) {
      uniquePlayerSpriteMap.set(String(id), sprObj);
    }
  };

  registerPlayerSprite(defaultPlayerSpriteSheetId);
  // Also register topdown and platform fallback sprites
  const defaultTopdownSpr = allSprites.find((s: any) =>
    s.states?.[0]?.animationType === "multi_movement" ||
    s.states?.[0]?.animationType === "multi"
  );
  if (defaultTopdownSpr) registerPlayerSprite(defaultTopdownSpr.id);

  allScenes.forEach((scene: any) => {
    let sheetId = scene.playerSpriteSheetId;
    if (!sheetId && (scene.type === "TOPDOWN" || scene.type === "ADVENTURE") && defaultTopdownSpr) {
      sheetId = defaultTopdownSpr.id;
    }
    registerPlayerSprite(sheetId);
  });

  if (uniquePlayerSpriteMap.size === 0 && spritePngFiles.length > 0) {
    const nonActorMatch = spritePngFiles.find(f => !String(f).includes("static") && !String(f).includes("actor"));
    const fn = String(nonActorMatch || spritePngFiles[0]);
    uniquePlayerSpriteMap.set("default", { filename: fn, name: fn.replace(/\.png$/i, "") });
  }

  // Process and convert frames for each unique player sprite
  const compiledPlayerSprites = new Map<string, any>();
  let playerDirectives = "";
  let playerSprWidth16 = 1;
  let playerSprHeight16 = 1;

  uniquePlayerSpriteMap.forEach((sprObj, key) => {
    const filename = String(sprObj.filename);
    const cleanSym = (sprObj.name || filename).replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    const symPrefix = `player_spr_${cleanSym}`;
    const palName = `player_pal_${cleanSym}`;
    const srcPng = pathModule.join(projectSpritesDir, filename);

    const destPcxR0 = pathModule.join(destSpritesDir, filename.replace(/\.png$/i, "_r0.pcx"));
    const destPcxR1 = pathModule.join(destSpritesDir, filename.replace(/\.png$/i, "_r1.pcx"));
    const destPcxL0 = pathModule.join(destSpritesDir, filename.replace(/\.png$/i, "_l0.pcx"));
    const destPcxL1 = pathModule.join(destSpritesDir, filename.replace(/\.png$/i, "_l1.pcx"));
    const destPcxU0 = pathModule.join(destSpritesDir, filename.replace(/\.png$/i, "_u0.pcx"));
    const destPcxU1 = pathModule.join(destSpritesDir, filename.replace(/\.png$/i, "_u1.pcx"));
    const destPcxD0 = pathModule.join(destSpritesDir, filename.replace(/\.png$/i, "_d0.pcx"));
    const destPcxD1 = pathModule.join(destSpritesDir, filename.replace(/\.png$/i, "_d1.pcx"));

    let origCropW = sprObj.canvasWidth || 16;
    let origCropH = sprObj.canvasHeight || 16;
    let width16 = Math.max(1, Math.min(2, Math.ceil(origCropW / 16)));
    let height16 = Math.max(1, Math.min(4, Math.ceil(origCropH / 16)));
    if (height16 === 3) height16 = 4;

    let vramWidth16 = (height16 >= 2) ? 2 : width16;
    let cropW = origCropW;
    let cropH = height16 * 16;
    let padWidthTo = vramWidth16 * 16;
    playerSprWidth16 = width16;
    playerSprHeight16 = height16;

    try {
      const getAnimFrameInfo = (animIdx: number, frameIdx = 0) => {
        const anim = sprObj?.states?.[0]?.animations?.[animIdx];
        if (!anim || !anim.frames || !anim.frames[frameIdx] || !anim.frames[frameIdx].tiles) return null;
        const tiles = anim.frames[frameIdx].tiles.filter((t: any) => typeof t.sliceX === "number" && typeof t.sliceY === "number");
        if (tiles.length === 0) return null;

        const cellCounts = new Map<string, number>();
        let hasTileFlipX = false;
        const cellSizeX = (origCropW >= 32) ? 32 : 16;
        const cellSizeY = (origCropH >= 32) ? 32 : 16;

        tiles.forEach((t: any) => {
          const cellX = Math.floor(t.sliceX / cellSizeX) * cellSizeX;
          const cellY = Math.floor(t.sliceY / cellSizeY) * cellSizeY;
          const key = `${cellX},${cellY}`;
          cellCounts.set(key, (cellCounts.get(key) || 0) + 1);
          if (t.flipX) hasTileFlipX = true;
        });

        let maxCount = -1;
        let bestKey = "";
        cellCounts.forEach((count, key) => {
          if (count > maxCount) {
            maxCount = count;
            bestKey = key;
          }
        });

        if (!bestKey) return null;
        const [cropX, cropY] = bestKey.split(",").map(Number);
        return { cropX, cropY, flipX: hasTileFlipX };
      };

      // 0: idleRight, 1: idleLeft, 2: idleUp, 3: idleDown, 4: movingRight, 5: movingLeft, 6: movingUp, 7: movingDown
      // infoR0 must be the Idle Right frame (Anim 0 Frame 0)
      const infoR0 = getAnimFrameInfo(0, 0) || getAnimFrameInfo(4, 0) || { cropX: 0, cropY: 0, flipX: false };
      const infoR1 = getAnimFrameInfo(4, 0) || getAnimFrameInfo(4, 1) || infoR0;
      const infoU0 = getAnimFrameInfo(2, 0) || getAnimFrameInfo(6, 0) || infoR0;
      const infoU1 = getAnimFrameInfo(6, 1) || getAnimFrameInfo(6, 0) || getAnimFrameInfo(2, 1) || infoU0;
      const infoD0 = getAnimFrameInfo(3, 0) || getAnimFrameInfo(7, 0) || infoR0;
      const infoD1 = getAnimFrameInfo(7, 1) || getAnimFrameInfo(7, 0) || getAnimFrameInfo(3, 1) || infoD0;

      const flipLeft = sprObj?.states?.[0]?.flipLeft ?? true;
      const infoL0 = flipLeft
        ? { cropX: infoR0.cropX, cropY: infoR0.cropY, flipX: !infoR0.flipX }
        : (getAnimFrameInfo(1, 0) || getAnimFrameInfo(5, 0) || infoR0);
      const infoL1 = flipLeft
        ? { cropX: infoR1.cropX, cropY: infoR1.cropY, flipX: !infoR1.flipX }
        : (getAnimFrameInfo(5, 0) || getAnimFrameInfo(5, 1) || infoR1);

      const sharedPal = buildPngPalette(srcPng);

      const d_r0 = convertPngToPcx(srcPng, destPcxR0, { cropX: infoR0.cropX, cropY: infoR0.cropY, cropW: cropW, cropH: cropH, padWidthTo: padWidthTo, flipX: infoR0.flipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
      const d_r1 = convertPngToPcx(srcPng, destPcxR1, { cropX: infoR1.cropX, cropY: infoR1.cropY, cropW: cropW, cropH: cropH, padWidthTo: padWidthTo, flipX: infoR1.flipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
      const d_l0 = convertPngToPcx(srcPng, destPcxL0, { cropX: infoL0.cropX, cropY: infoL0.cropY, cropW: cropW, cropH: cropH, padWidthTo: padWidthTo, flipX: infoL0.flipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
      const d_l1 = convertPngToPcx(srcPng, destPcxL1, { cropX: infoL1.cropX, cropY: infoL1.cropY, cropW: cropW, cropH: cropH, padWidthTo: padWidthTo, flipX: infoL1.flipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
      const d_u0 = convertPngToPcx(srcPng, destPcxU0, { cropX: infoU0.cropX, cropY: infoU0.cropY, cropW: cropW, cropH: cropH, padWidthTo: padWidthTo, flipX: infoU0.flipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
      const d_u1 = convertPngToPcx(srcPng, destPcxU1, { cropX: infoU1.cropX, cropY: infoU1.cropY, cropW: cropW, cropH: cropH, padWidthTo: padWidthTo, flipX: infoU1.flipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
      const d_d0 = convertPngToPcx(srcPng, destPcxD0, { cropX: infoD0.cropX, cropY: infoD0.cropY, cropW: cropW, cropH: cropH, padWidthTo: padWidthTo, flipX: infoD0.flipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
      const d_d1 = convertPngToPcx(srcPng, destPcxD1, { cropX: infoD1.cropX, cropY: infoD1.cropY, cropW: cropW, cropH: cropH, padWidthTo: padWidthTo, flipX: infoD1.flipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });

      const allFrames = [d_r0, d_r1, d_l0, d_l1, d_u0, d_u1, d_d0, d_d1];
      let maxBottom = -1;
      let minTop = 999;
      let minLeft = 999;
      let maxRight = -1;
      allFrames.forEach((f: any) => {
        if (f.maxPixelY > maxBottom) maxBottom = f.maxPixelY;
        if (f.minPixelY >= 0 && f.minPixelY < minTop) minTop = f.minPixelY;
        if (f.minPixelX >= 0 && f.minPixelX < minLeft) minLeft = f.minPixelX;
        if (f.maxPixelX > maxRight) maxRight = f.maxPixelX;
      });

      const bboxBottom = maxBottom > 0 ? maxBottom : (height16 * 16 - 1);
      let bboxTop = (minTop < maxBottom && minTop >= 0) ? (minTop + Math.floor((maxBottom - minTop) / 2)) : 8;
      let bboxLeft = (minLeft >= 0 && minLeft < 16) ? Math.max(1, minLeft + 1) : 2;
      let bboxRight = (maxRight >= 0 && maxRight < 32) ? Math.min(width16 * 16 - 2, maxRight - 1) : 13;

      if (typeof sprObj?.boundsWidth === "number" && sprObj.boundsWidth > 0) {
        const bX = typeof sprObj.boundsX === "number" && sprObj.boundsX >= 0 ? sprObj.boundsX : 0;
        bboxLeft = bX;
        bboxRight = Math.min(width16 * 16 - 1, bX + sprObj.boundsWidth - 1);
      }
      if (typeof sprObj?.boundsHeight === "number" && sprObj.boundsHeight > 0) {
        bboxTop = Math.max(0, bboxBottom - sprObj.boundsHeight + 1);
      }

      const relR0 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxR0).replace(/\\/g, "/")}`;
      const relR1 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxR1).replace(/\\/g, "/")}`;
      const relL0 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxL0).replace(/\\/g, "/")}`;
      const relL1 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxL1).replace(/\\/g, "/")}`;
      const relU0 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxU0).replace(/\\/g, "/")}`;
      const relU1 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxU1).replace(/\\/g, "/")}`;
      const relD0 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxD0).replace(/\\/g, "/")}`;
      const relD1 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxD1).replace(/\\/g, "/")}`;

      playerDirectives += `
#incspr(${symPrefix}_r0, "${relR0}", 0, 0, ${vramWidth16}, ${height16})
#incpal(${palName}, "${relR0}")
#incspr(${symPrefix}_r1, "${relR1}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_l0, "${relL0}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_l1, "${relL1}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_u0, "${relU0}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_u1, "${relU1}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_d0, "${relD0}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_d1, "${relD1}", 0, 0, ${vramWidth16}, ${height16})
`;
      let vramSizeHex = "0x40";
      let sizeConst = "SZ_16x16";
      if (width16 === 1 && height16 === 2) {
        vramSizeHex = "0x100";
        sizeConst = "SZ_16x32";
      } else if (width16 === 2 && height16 === 1) {
        vramSizeHex = "0x80";
        sizeConst = "SZ_32x16";
      } else if (width16 === 2 && height16 === 2) {
        vramSizeHex = "0x100";
        sizeConst = "SZ_32x32";
      } else if (width16 === 2 && height16 === 4) {
        vramSizeHex = "0x200";
        sizeConst = "SZ_32x64";
      } else if (width16 === 1 && height16 === 4) {
        vramSizeHex = "0x200";
        sizeConst = "SZ_16x64";
      }

      compiledPlayerSprites.set(key, { symPrefix, palName, width16, height16, filename, vramSizeHex, sizeConst, bboxLeft, bboxRight, bboxTop, bboxBottom });
    } catch (e) {
      console.error("Error converting player sprite frames to PCX:", e);
    }
  });

  // Build per-scene player sprite loader cases
  let scenePlayerSpriteCases = "";
  const firstCompiled = Array.from(compiledPlayerSprites.values())[0];
  allScenes.forEach((scene: any, sceneIdx: number) => {
    const scNum = sceneIdx + 1;
    let sheetId = scene.playerSpriteSheetId;
    if (!sheetId && (scene.type === "TOPDOWN" || scene.type === "ADVENTURE") && defaultTopdownSpr) {
      sheetId = defaultTopdownSpr.id;
    }
    sheetId = sheetId || defaultPlayerSpriteSheetId;
    const compiled = compiledPlayerSprites.get(String(sheetId)) || firstCompiled;
    if (compiled) {
      scenePlayerSpriteCases += `    case ${scNum}:
      g_player_spr_vram_size = ${compiled.vramSizeHex};
      g_player_spr_size = ${compiled.sizeConst};
      g_actor_size[0] = ${compiled.sizeConst};
      g_player_bbox_left = ${compiled.bboxLeft};
      g_player_bbox_right = ${compiled.bboxRight};
      g_player_bbox_top = ${compiled.bboxTop};
      g_player_bbox_bottom = ${compiled.bboxBottom};
      g_actor_bbox_left[0] = ${compiled.bboxLeft};
      g_actor_bbox_right[0] = ${compiled.bboxRight};
      g_actor_bbox_top[0] = ${compiled.bboxTop};
      g_actor_bbox_bottom[0] = ${compiled.bboxBottom};
      load_vram(0x5000 + 0 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_r0, ${compiled.vramSizeHex});
      load_vram(0x5000 + 1 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_r1, ${compiled.vramSizeHex});
      load_vram(0x5000 + 2 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_l0, ${compiled.vramSizeHex});
      load_vram(0x5000 + 3 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_l1, ${compiled.vramSizeHex});
      load_vram(0x5000 + 4 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_u0, ${compiled.vramSizeHex});
      load_vram(0x5000 + 5 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_u1, ${compiled.vramSizeHex});
      load_vram(0x5000 + 6 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_d0, ${compiled.vramSizeHex});
      load_vram(0x5000 + 7 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_d1, ${compiled.vramSizeHex});
      load_palette(16, ${compiled.palName}, 1);
      break;\n`;
    }
  });

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
        let origW16 = 1;
        let origH16 = 1;

        const canvasW = sprObj?.canvasWidth || 16;
        const canvasH = sprObj?.canvasHeight || 16;
        origW16 = Math.max(1, Math.min(2, Math.ceil(canvasW / 16)));
        origH16 = Math.max(1, Math.min(4, Math.ceil(canvasH / 16)));
        if (origH16 === 3) origH16 = 4;

        if (sprObj) {
          cropX = getCropXForActor(scActor, sprObj, canvasW);
        } else {
          cropX = getCropXForActor(scActor, null, 16);
        }

        let actVramW16 = (origH16 >= 2) ? 2 : origW16;
        cropW = canvasW;
        cropH = origH16 * 16;
        const padWidthTo = actVramW16 * 16;
        const w16 = actVramW16;
        const h16 = origH16;

        let sprSizeConst = "SZ_16x16";
        let vramSizeHex = "0x40";
        if (origW16 === 1 && origH16 === 2) {
          sprSizeConst = "SZ_16x32";
          vramSizeHex = "0x100";
        } else if (origW16 === 2 && origH16 === 1) {
          sprSizeConst = "SZ_32x16";
          vramSizeHex = "0x80";
        } else if (origW16 === 2 && origH16 === 2) {
          sprSizeConst = "SZ_32x32";
          vramSizeHex = "0x100";
        } else if (origW16 === 2 && origH16 === 4) {
          sprSizeConst = "SZ_32x64";
          vramSizeHex = "0x200";
        } else if (origW16 === 1 && origH16 === 4) {
          sprSizeConst = "SZ_16x64";
          vramSizeHex = "0x200";
        }

        const sharedPal = buildPngPalette(srcPng);

        // Extract all animation frames for this actor
        let actorAnimFrames: any[] = [];
        if (sprObj?.states?.[0]?.animations) {
          const animType = sprObj.states[0].animationType || "fixed";
          let animIdx = 0;
          if (animType === "multi_movement" || animType === "multi") {
            const dir = scActor?.direction?.toLowerCase() || "down";
            if (dir === "right") animIdx = 0;
            else if (dir === "left") animIdx = 1;
            else if (dir === "up") animIdx = 2;
            else animIdx = 3;
          } else {
            animIdx = 0;
          }
          const anim = sprObj.states[0].animations[animIdx] || sprObj.states[0].animations[0];
          if (anim && Array.isArray(anim.frames)) {
            actorAnimFrames = anim.frames;
          }
        }

        let maxAllowedFrames = 1;
        if (vramSizeHex === "0x40") maxAllowedFrames = 4;
        else if (vramSizeHex === "0x80" || vramSizeHex === "0x100") maxAllowedFrames = 2;

        const numFrames = Math.max(1, Math.min(maxAllowedFrames, actorAnimFrames.length > 0 ? actorAnimFrames.length : 1));

        for (let fIdx = 0; fIdx < numFrames; fIdx++) {
          let fCropX = cropX;
          let fCropY = cropY;
          if (actorAnimFrames[fIdx]?.tiles && Array.isArray(actorAnimFrames[fIdx].tiles)) {
            const validTiles = actorAnimFrames[fIdx].tiles.filter((t: any) => typeof t.sliceX === "number" && typeof t.sliceY === "number");
            if (validTiles.length > 0) {
              let minX = 9999;
              let minY = 9999;
              validTiles.forEach((t: any) => {
                if (t.sliceX < minX) minX = t.sliceX;
                if (t.sliceY < minY) minY = t.sliceY;
              });
              if (minX !== 9999 && minY !== 9999) {
                fCropX = minX;
                fCropY = minY;
              }
            }
          } else if (fIdx > 0) {
            fCropX = cropX + (fIdx * canvasW);
          }

          const destPcxF = pathModule.join(destSpritesDir, sprFilename.replace(/\.png$/i, `_sc${sceneNum}_${actorNum}_f${fIdx}.pcx`));
          convertPngToPcx(srcPng, destPcxF, { cropX: fCropX, cropY: fCropY, cropW, cropH, padWidthTo, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });

          const relPcxF = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxF).replace(/\\/g, "/")}`;
          actorDirectives += `#incspr(actor_sc${sceneNum}_${actorNum}_f${fIdx}_spr, "${relPcxF}", 0, 0, ${w16}, ${h16})\n`;
          if (fIdx === 0) {
            actorDirectives += `#incspr(actor_sc${sceneNum}_${actorNum}_spr, "${relPcxF}", 0, 0, ${w16}, ${h16})\n#incpal(actor_sc${sceneNum}_${actorNum}_pal, "${relPcxF}")\n`;
            if (aIdx === 0) {
              actorDirectives += `#incspr(actor_sc${sceneNum}_spr, "${relPcxF}", 0, 0, ${w16}, ${h16})\n#incpal(actor_sc${sceneNum}_pal, "${relPcxF}")\n`;
            }
          }
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
        const animSpeedVal = (typeof scActor.animSpeed === "number" && scActor.animSpeed > 0) ? scActor.animSpeed : 15;

        let actBBoxLeft = 0;
        let actBBoxRight = canvasW - 1;
        let actBBoxBottom = canvasH - 1;
        let actBBoxTop = 0;

        if (typeof sprObj?.boundsX === "number" && sprObj.boundsX >= 0) {
          actBBoxLeft = sprObj.boundsX;
        }
        if (typeof sprObj?.boundsWidth === "number" && sprObj.boundsWidth > 0) {
          actBBoxRight = Math.min(canvasW - 1, actBBoxLeft + sprObj.boundsWidth - 1);
        }
        if (typeof sprObj?.boundsHeight === "number" && sprObj.boundsHeight > 0) {
          actBBoxTop = Math.max(0, actBBoxBottom - sprObj.boundsHeight + 1);
        }

        actorDefines += `#define HAS_ACTOR_SCENE_${sceneNum}_${actorNum} 1\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_X ${actX}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_Y ${actY}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_VRAM_SIZE ${vramSizeHex}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_SPRITE_SIZE ${sprSizeConst}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_NUM_FRAMES ${numFrames}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_ANIM_SPEED ${animSpeedVal}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_BBOX_LEFT ${actBBoxLeft}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_BBOX_RIGHT ${actBBoxRight}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_BBOX_TOP ${actBBoxTop}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_BBOX_BOTTOM ${actBBoxBottom}\n${textDef}${hiddenDef}${interactDefs}`;

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
      let info: any = musicIdMap[mId];
      if (!info && musicByFilenameMap[mId]) info = musicByFilenameMap[mId];
      if (info) {
        let fn: string = info.filename || (info.id ? `${info.id}.uge` : `${mId}.uge`);
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
  const parseInputButtonMask = (inputArg: any): number => {
    if (!inputArg) return 0x01;
    const list = Array.isArray(inputArg) ? inputArg : [inputArg];
    let mask = 0;
    for (const item of list) {
      const s = String(item).toLowerCase().trim();
      if (s === "a" || s === "btn_a" || s === "button_a") mask |= 0x01; // JOY_A / JOY_I
      if (s === "b" || s === "btn_b" || s === "button_b") mask |= 0x02; // JOY_B / JOY_II
      if (s === "select" || s === "sel" || s === "slct") mask |= 0x04; // JOY_SEL
      if (s === "start" || s === "strt" || s === "run") mask |= 0x08; // JOY_STRT / JOY_RUN
      if (s === "up") mask |= 0x10;
      if (s === "right" || s === "rght") mask |= 0x20;
      if (s === "down") mask |= 0x40;
      if (s === "left") mask |= 0x80;
    }
    return mask || 0x01;
  };

  const findInputScriptEvents = (events: any[]): any[] => {
    const result: any[] = [];
    if (!Array.isArray(events)) return result;
    for (const evt of events) {
      if (!evt || typeof evt !== "object" || evt.args?.__comment) continue;
      if (
        evt.command === "EVENT_SET_INPUT_SCRIPT" ||
        evt.command === "EVENT_INPUT_SCRIPT_SET" ||
        evt.command === "EVENT_ATTACH_SCRIPT" ||
        evt.command === "EVENT_INPUT_ATTACH_SCRIPT"
      ) {
        result.push(evt);
      }
      if (evt.children && typeof evt.children === "object") {
        Object.values(evt.children).forEach((cList: any) => {
          if (Array.isArray(cList)) {
            result.push(...findInputScriptEvents(cList));
          }
        });
      }
      if (evt.true && Array.isArray(evt.true) && evt.command !== "EVENT_SET_INPUT_SCRIPT" && evt.command !== "EVENT_INPUT_SCRIPT_SET") {
        result.push(...findInputScriptEvents(evt.true));
      }
      if (evt.false && Array.isArray(evt.false)) {
        result.push(...findInputScriptEvents(evt.false));
      }
    }
    return result;
  };

  const parseVarIndex = (vArg: any): number => {
    if (typeof vArg === "number") return vArg & 0xFF;
    if (typeof vArg === "string") {
      const num = parseInt(vArg.replace(/\D/g, ""), 10);
      if (!isNaN(num)) return num & 0xFF;
    }
    return 0;
  };

  let sceneStepHelpers = "";
  let sceneInitCases = "";
  let sceneInputCheckHelpers = "";
  let sceneInputCheckCases = "";
  let sceneStartupCases = "";
  let sceneActorInteractHelpers = "";
  let sceneActorInteractCases = "";

  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const events = [
      ...(Array.isArray(scene.script) ? scene.script : []),
      ...(Array.isArray(scene.startScript) ? scene.startScript : [])
    ];

    const findTargetNum = (actArg: string | undefined, defaultActor: number = 0): number => {
      if (!actArg || actArg === "$self$") return defaultActor;
      if (actArg === "player") return 0;
      const targetIdx = (scene.actors || []).findIndex((a: any) => a.id === actArg);
      if (targetIdx !== -1) return targetIdx + 1;
      return defaultActor;
    };

    let stepIndex = 0;
    let stepCases = "";

    const processEventList = (evts: any[], isStartupContext = false, currentActorNum = 0) => {
      if (!Array.isArray(evts)) return;
      for (const evt of evts) {
        if (!evt || typeof evt !== "object" || evt.args?.__comment) continue;

        // Skip attaching input script inside startup sequence
        if (
          isStartupContext &&
          (evt.command === "EVENT_SET_INPUT_SCRIPT" ||
           evt.command === "EVENT_INPUT_SCRIPT_SET" ||
           evt.command === "EVENT_ATTACH_SCRIPT" ||
           evt.command === "EVENT_INPUT_ATTACH_SCRIPT")
        ) {
          continue;
        }

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
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          stepCases += `      case ${stepIndex}:\n        actor_show(${targetNum});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_HIDE") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          stepCases += `      case ${stepIndex}:\n        actor_hide(${targetNum});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_COLLISIONS_DISABLE") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          stepCases += `      case ${stepIndex}:\n        actor_set_collisions(${targetNum}, 0);\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_COLLISIONS_ENABLE") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          stepCases += `      case ${stepIndex}:\n        actor_set_collisions(${targetNum}, 1);\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_MOVE_TO" || evt.command === "EVENT_ACTOR_MOVE_TO_VALUE") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          const px = parseCoord(evt.args?.x, 0) * 8;
          const py = parseCoord(evt.args?.y, 0) * 8;
          stepCases += `      case ${stepIndex}:\n        actor_move_to(${targetNum}, ${px}, ${py});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_MOVE_RELATIVE") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          const dx = parseCoord(evt.args?.x, 0) * 8;
          const dy = parseCoord(evt.args?.y, 0) * 8;
          stepCases += `      case ${stepIndex}:\n        actor_set_pos_rel(${targetNum}, ${dx}, ${dy});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_SET_DIRECTION" || evt.command === "EVENT_ACTOR_SET_DIRECTION_TO_VALUE") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          const dStr = String(evt.args?.direction || "down").toLowerCase();
          let dNum = 3;
          if (dStr === "right") dNum = 0;
          else if (dStr === "left") dNum = 1;
          else if (dStr === "up") dNum = 2;
          stepCases += `      case ${stepIndex}:\n        actor_set_dir(${targetNum}, ${dNum});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_SET_MOVEMENT_SPEED") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          const spd = parseCoord(evt.args?.speed, 1);
          stepCases += `      case ${stepIndex}:\n        actor_set_move_speed(${targetNum}, ${spd});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_SET_ANIMATION_SPEED") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          const spd = parseCoord(evt.args?.speed, 1);
          stepCases += `      case ${stepIndex}:\n        actor_set_anim_speed(${targetNum}, ${spd});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_SET_FRAME" || evt.command === "EVENT_ACTOR_SET_FRAME_TO_VALUE") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          const frm = parseCoord(evt.args?.frame, 0);
          stepCases += `      case ${stepIndex}:\n        actor_set_frame(${targetNum}, ${frm});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_EMOTE") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          const emoteId = parseCoord(evt.args?.emoteId, 0);
          stepCases += `      case ${stepIndex}:\n        actor_emote(${targetNum}, ${emoteId});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_ACTOR_PUSH") {
          const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
          stepCases += `      case ${stepIndex}:\n        actor_push(${targetNum}, g_actor_dir[0]);\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_CAMERA_MOVE_TO" || evt.command === "EVENT_CAMERA_SET_POSITION") {
          const cx = parseCoord(evt.args?.x, 0) * 8;
          const cy = parseCoord(evt.args?.y, 0) * 8;
          stepCases += `      case ${stepIndex}:\n        camera_update(${cx}, ${cy});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (
          evt.command === "EVENT_AWAIT_INPUT" ||
          evt.command === "EVENT_INPUT_AWAIT" ||
          evt.command === "EVENT_WAIT_INPUT"
        ) {
          const mask = parseInputButtonMask(evt.args?.input);
          const maskHex = `0x${mask.toString(16).toUpperCase().padStart(2, "0")}`;
          stepCases += `      case ${stepIndex}:\n        g_await_input_mask = ${maskHex};\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_CHOICE") {
          const varIdx = parseVarIndex(evt.args?.variable);
          const trueText = String(evt.args?.trueText || "Yes").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
          const falseText = String(evt.args?.falseText || "No").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
          stepCases += `      case ${stepIndex}:\n        show_choice(${varIdx}, "${trueText}", "${falseText}");\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_MENU") {
          const varIdx = parseVarIndex(evt.args?.variable);
          const items = Math.max(2, Math.min(4, Number(evt.args?.items) || 2));
          const opt1 = String(evt.args?.option1 || "Option 1").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
          const opt2 = String(evt.args?.option2 || "Option 2").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
          const opt3 = String(evt.args?.option3 || "Option 3").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
          const opt4 = String(evt.args?.option4 || "Option 4").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
          const cancelB = evt.args?.cancelOnB !== false ? 1 : 0;
          stepCases += `      case ${stepIndex}:\n        show_menu(${varIdx}, ${items}, "${opt1}", "${opt2}", "${opt3}", "${opt4}", ${cancelB});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (
          evt.command === "EVENT_SET_VALUE" ||
          evt.command === "EVENT_VARIABLE_SET_TO_VALUE" ||
          evt.command === "EVENT_SET_VARIABLE"
        ) {
          const varIdx = parseVarIndex(evt.args?.variable);
          const val = typeof evt.args?.value === "number" ? evt.args.value : (Number(evt.args?.value) || 0);
          stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, ${val});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_VARIABLE_SET_TO_TRUE") {
          const varIdx = parseVarIndex(evt.args?.variable);
          stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, 1);\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_VARIABLE_SET_TO_FALSE") {
          const varIdx = parseVarIndex(evt.args?.variable);
          stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, 0);\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_INC_VALUE" || evt.command === "EVENT_VARIABLE_INC") {
          const varIdx = parseVarIndex(evt.args?.variable);
          stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, vm_get_var(${varIdx}) + 1);\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_DEC_VALUE" || evt.command === "EVENT_VARIABLE_DEC") {
          const varIdx = parseVarIndex(evt.args?.variable);
          stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, vm_get_var(${varIdx}) - 1);\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (
          evt.command === "EVENT_IF" ||
          evt.command === "EVENT_IF_TRUE" ||
          evt.command === "EVENT_IF_VARIABLE_TRUE" ||
          evt.command === "EVENT_IF_FALSE" ||
          evt.command === "EVENT_IF_VARIABLE_FALSE" ||
          evt.command === "EVENT_IF_VALUE" ||
          evt.command === "EVENT_IF_VARIABLE_VALUE" ||
          evt.command === "EVENT_IF_VALUE_COMPARE" ||
          evt.command === "EVENT_IF_VARIABLE_COMPARE"
        ) {
          const varIdx = parseVarIndex(evt.args?.variable);
          const isFalseCheck = (evt.command === "EVENT_IF_FALSE" || evt.command === "EVENT_IF_VARIABLE_FALSE");
          
          let condExpr = isFalseCheck ? `(vm_get_var(${varIdx}) == 0)` : `(vm_get_var(${varIdx}) != 0)`;
          if (evt.args?.operator) {
            const op = evt.args.operator;
            const val = typeof evt.args.value === "number" ? evt.args.value : (Number(evt.args.value) || 0);
            if (op === "==" || op === "eq") condExpr = `(vm_get_var(${varIdx}) == ${val})`;
            else if (op === "!=" || op === "ne") condExpr = `(vm_get_var(${varIdx}) != ${val})`;
            else if (op === ">" || op === "gt") condExpr = `(vm_get_var(${varIdx}) > ${val})`;
            else if (op === "<" || op === "lt") condExpr = `(vm_get_var(${varIdx}) < ${val})`;
            else if (op === ">=" || op === "gte") condExpr = `(vm_get_var(${varIdx}) >= ${val})`;
            else if (op === "<=" || op === "lte") condExpr = `(vm_get_var(${varIdx}) <= ${val})`;
          }

          const trueList = (evt.true && Array.isArray(evt.true)) ? evt.true : (evt.children?.true && Array.isArray(evt.children.true) ? evt.children.true : []);
          const falseList = (evt.false && Array.isArray(evt.false)) ? evt.false : (evt.children?.false && Array.isArray(evt.children.false) ? evt.children.false : []);

          const branchStep = stepIndex;
          stepIndex++;

          const trueStart = stepIndex;
          processEventList(trueList, isStartupContext);
          const trueEndJumpStep = stepIndex;
          stepIndex++;

          const falseStart = stepIndex;
          processEventList(falseList, isStartupContext);
          const afterStep = stepIndex;

          stepCases += `      case ${branchStep}:\n        if ${condExpr} return ${trueStart};\n        else return ${falseStart};\n`;
          stepCases += `      case ${trueEndJumpStep}:\n        return ${afterStep};\n`;
          continue;
        } else if (evt.command === "EVENT_DIALOGUE_CLOSE_NONMODAL") {
          stepCases += `      case ${stepIndex}:\n        hide_dialogue();\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_HIDE_SPRITES") {
          stepCases += `      case ${stepIndex}:\n        actor_hide_all();\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_MUSIC_STOP") {
          stepCases += `      case ${stepIndex}:\n        pce_sound_stop();\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_MATH_ADD" || evt.command === "EVENT_MATH_ADD_VALUE") {
          const varIdx = parseVarIndex(evt.args?.variable);
          const val = typeof evt.args?.value === "number" ? evt.args.value : (Number(evt.args?.value) || 0);
          stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, vm_get_var(${varIdx}) + ${val});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (evt.command === "EVENT_MATH_SUB" || evt.command === "EVENT_MATH_SUB_VALUE") {
          const varIdx = parseVarIndex(evt.args?.variable);
          const val = typeof evt.args?.value === "number" ? evt.args.value : (Number(evt.args?.value) || 0);
          stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, vm_get_var(${varIdx}) - ${val});\n        return ${stepIndex + 1};\n`;
          stepIndex++;
        } else if (
          evt.command === "EVENT_LOOP" ||
          evt.command === "EVENT_LOOP_FOR" ||
          evt.command === "EVENT_LOOP_WHILE" ||
          evt.command === "EVENT_LOOP_WHILE_EXPRESSION"
        ) {
          const loopStart = stepIndex;
          const loopBody = (evt.children?.true && Array.isArray(evt.children.true))
            ? evt.children.true
            : (evt.true && Array.isArray(evt.true))
            ? evt.true
            : (evt.children && typeof evt.children === "object")
            ? Object.values(evt.children).flatMap((x: any) => Array.isArray(x) ? x : [])
            : [];
          processEventList(loopBody, isStartupContext);
          const loopEnd = stepIndex;
          stepCases += `      case ${loopEnd}:\n        return ${loopStart};\n`;
          stepIndex++;
          continue;
        } else if (evt.command === "EVENT_LOOP_BREAK" || evt.command === "EVENT_BREAK") {
          stepCases += `      case ${stepIndex}:\n        return -1;\n`;
          stepIndex++;
        } else if (
          evt.command === "EVENT_LOAD_DATA" ||
          evt.command === "EVENT_LOAD_PROJECTILE_SLOT" ||
          evt.command === "EVENT_MATH_DIV" ||
          evt.command === "EVENT_MATH_DIV_VALUE" ||
          evt.command === "EVENT_MATH_MOD" ||
          evt.command === "EVENT_MATH_MOD_VALUE" ||
          evt.command === "EVENT_MATH_MUL" ||
          evt.command === "EVENT_MATH_MUL_VALUE" ||
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
          evt.command === "EVENT_IF_ACTOR_AT_POSITION" ||
          evt.command === "EVENT_IF_ACTOR_DIRECTION" ||
          evt.command === "EVENT_IF_ACTOR_DISTANCE_FROM_ACTOR" ||
          evt.command === "EVENT_IF_ACTOR_RELATIVE_TO_ACTOR" ||
          evt.command === "EVENT_IF_COLOR_SUPPORTED" ||
          evt.command === "EVENT_IF_CURRENT_SCENE_IS" ||
          evt.command === "EVENT_IF_ENGINE_FIELD" ||
          evt.command === "EVENT_IF_ENGINE_FIELD_COMPARE" ||
          evt.command === "EVENT_IF_EXPRESSION" ||
          evt.command === "EVENT_IF_FLAGS_COMPARE" ||
          evt.command === "EVENT_IF_FLAGS_COMPARE" ||
          evt.command === "EVENT_IF_INPUT" ||
          evt.command === "EVENT_IF_SAVED_DATA" ||
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
          Object.values(evt.children).forEach((cEvts: any) => processEventList(cEvts, isStartupContext, currentActorNum));
        }
        if (evt.true && Array.isArray(evt.true) && evt.command !== "EVENT_SET_INPUT_SCRIPT" && evt.command !== "EVENT_INPUT_SCRIPT_SET") {
          processEventList(evt.true, isStartupContext, currentActorNum);
        }
        if (evt.false && Array.isArray(evt.false)) processEventList(evt.false, isStartupContext, currentActorNum);
      }
    };

    processEventList(events, true, 0);
    const startupStepsCount = stepIndex;
    if (startupStepsCount > 0) {
      stepCases += `      case ${stepIndex}:\n        return -1;\n`;
      stepIndex++;
    }

    const sceneInputEvents = [
      ...findInputScriptEvents(scene.script),
      ...findInputScriptEvents(scene.startScript),
      ...(scene.actors || []).flatMap((act: any) => [
        ...findInputScriptEvents(act.script),
        ...findInputScriptEvents(act.startScript)
      ])
    ];

    const sceneInputScripts: { mask: number; startStep: number }[] = [];
    for (const inputEvt of sceneInputEvents) {
      const mask = parseInputButtonMask(inputEvt.args?.input);
      const childEvents = (inputEvt.true && Array.isArray(inputEvt.true))
        ? inputEvt.true
        : (inputEvt.children?.true && Array.isArray(inputEvt.children.true))
        ? inputEvt.children.true
        : (inputEvt.children?.press && Array.isArray(inputEvt.children.press))
        ? inputEvt.children.press
        : [];

      const startStep = stepIndex;
      processEventList(childEvents, false, 0);
      stepCases += `      case ${stepIndex}:\n        return -1;\n`;
      stepIndex++;
      sceneInputScripts.push({ mask, startStep });
    }

    let inputChecks = "";
    sceneInputScripts.forEach((inp) => {
      const maskHex = `0x${inp.mask.toString(16).toUpperCase().padStart(2, "0")}`;
      inputChecks += `  if (pressed & ${maskHex}) {\n    g_script_scene = ${scNum};\n    g_script_step = ${inp.startStep};\n    g_script_step = run_scene_${scNum}_step(g_script_step);\n    return 1;\n  }\n`;
    });

    if (inputChecks) {
      sceneInputCheckHelpers += `int check_scene_${scNum}_input(unsigned int pressed) {\n${inputChecks}  return 0;\n}\n\n`;
      sceneInputCheckCases += `  if (scene_num == ${scNum}) return check_scene_${scNum}_input(pressed);\n`;
    }

    const actorInteractCases: string[] = [];
    (scene.actors || []).forEach((scActor: any, aIdx: number) => {
      const actorNum = aIdx + 1;
      if (scActor.script && Array.isArray(scActor.script) && scActor.script.length > 0) {
        const actorStartStep = stepIndex;
        processEventList(scActor.script, false, actorNum);
        stepCases += `      case ${stepIndex}:\n        return -1;\n`;
        stepIndex++;
        actorInteractCases.push(`    case ${actorNum}:\n      g_script_scene = ${scNum};\n      g_script_step = ${actorStartStep};\n      g_script_step = run_scene_step(${scNum}, ${actorStartStep});\n      return 1;\n`);
      } else {
        const actText = extractActorText(scActor);
        if (actText) {
          const cleanText = actText.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
          const textStep = stepIndex;
          stepCases += `      case ${textStep}:\n        show_dialogue("${cleanText}");\n        return -1;\n`;
          stepIndex++;
          actorInteractCases.push(`    case ${actorNum}:\n      g_script_scene = ${scNum};\n      g_script_step = ${textStep};\n      g_script_step = run_scene_step(${scNum}, ${textStep});\n      return 1;\n`);
        }
      }
    });

    if (actorInteractCases.length > 0) {
      sceneActorInteractHelpers += `int interact_scene_${scNum}_actor(int actor_num) {\n  switch (actor_num) {\n${actorInteractCases.join("")}    default:\n      return 0;\n  }\n}\n\n`;
      sceneActorInteractCases += `  if (scene_num == ${scNum}) return interact_scene_${scNum}_actor(actor_num);\n`;
    }

    sceneStartupCases += `  if (scene_num == ${scNum}) return ${startupStepsCount > 0 ? 1 : 0};\n`;

    if (stepCases) {
      sceneStepHelpers += `int run_scene_${scNum}_step(int step) {\n  switch (step) {\n${stepCases}    default:\n      return -1;\n  }\n}\n\n`;
      sceneInitCases += `  if (scene_num == ${scNum}) res_step = run_scene_${scNum}_step(step);\n`;
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

  let sceneBackgroundCases = "";
  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const dim = sceneDimensions[idx] || { width: 32, height: 28 };
    sceneBackgroundCases += `    case ${scNum}:\n      g_current_scene_type = SCENE_${scNum}_TYPE;\n      g_collision_width = SCENE_${scNum}_WIDTH;\n      g_collision_height = SCENE_${scNum}_HEIGHT;\n      set_screen_size(SCENE_${scNum}_SCR_SIZE);\n      camera_set_bounds(SCENE_${scNum}_WIDTH, SCENE_${scNum}_HEIGHT);\n      load_background(bg_scene${scNum}_chr, bg_scene${scNum}_pal, bg_scene${scNum}_bat, ${dim.width}, ${dim.height});\n      set_map_data(scene_${scNum}_collisions, ${dim.width}, ${dim.height});\n      break;\n`;
  });

  let sceneActorCases = "";
  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const sceneActors = scene.actors || [];
    let actCaseCode = `    case ${scNum}:\n`;
    actCaseCode += `      g_actor_count = ${1 + sceneActors.length};\n`;
    actCaseCode += `      #ifdef ACTOR_SCENE_${scNum}_PLAYER_HIDDEN\n`;
    actCaseCode += `      actor_hide(0);\n`;
    actCaseCode += `      #endif\n`;

    let currentVram = 0x5800;
    sceneActors.forEach((scActor: any, aIdx: number) => {
      const actorNum = aIdx + 1;
      const palIdx = 1 + (aIdx % 15);
      const vramHex = `0x${currentVram.toString(16).toUpperCase()}`;

      let sprObj: any = null;
      if (scActor.spriteSheetId && allSprites.length > 0) {
        sprObj = allSprites.find((s: any) => s.id === scActor.spriteSheetId);
      }
      let actorAnimFrames: any[] = [];
      if (sprObj?.states?.[0]?.animations) {
        const animType = sprObj.states[0].animationType || "fixed";
        let animIdx = 0;
        if (animType === "multi_movement" || animType === "multi") {
          const dir = scActor?.direction?.toLowerCase() || "down";
          if (dir === "right") animIdx = 0;
          else if (dir === "left") animIdx = 1;
          else if (dir === "up") animIdx = 2;
          else animIdx = 3;
        } else {
          animIdx = 0;
        }
        const anim = sprObj.states[0].animations[animIdx] || sprObj.states[0].animations[0];
        if (anim && Array.isArray(anim.frames)) {
          actorAnimFrames = anim.frames;
        }
      }
      const canvasW = sprObj?.canvasWidth || 16;
      const canvasH = sprObj?.canvasHeight || 16;
      const origW16 = Math.max(1, Math.min(2, Math.ceil(canvasW / 16)));
      let origH16 = Math.max(1, Math.min(4, Math.ceil(canvasH / 16)));
      if (origH16 === 3) origH16 = 4;
      let vramSizeHex = "0x40";
      if (origW16 === 1 && origH16 === 2) vramSizeHex = "0x100";
      else if (origW16 === 2 && origH16 === 1) vramSizeHex = "0x80";
      else if (origW16 === 2 && origH16 === 2) vramSizeHex = "0x100";
      else if (origW16 === 2 && origH16 === 4) vramSizeHex = "0x200";
      else if (origW16 === 1 && origH16 === 4) vramSizeHex = "0x200";

      let maxAllowedFrames = 1;
      if (vramSizeHex === "0x40") maxAllowedFrames = 4;
      else if (vramSizeHex === "0x80" || vramSizeHex === "0x100") maxAllowedFrames = 2;

      const numFrames = Math.max(1, Math.min(maxAllowedFrames, actorAnimFrames.length > 0 ? actorAnimFrames.length : 1));

      actCaseCode += `      #ifdef HAS_ACTOR_SCENE_${scNum}_${actorNum}\n`;
      actCaseCode += `      load_vram(${vramHex}, actor_sc${scNum}_${actorNum}_f0_spr, ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE);\n`;
      if (numFrames >= 2) {
        actCaseCode += `      load_vram(${vramHex} + ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE, actor_sc${scNum}_${actorNum}_f1_spr, ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE);\n`;
      }
      if (numFrames >= 3) {
        actCaseCode += `      load_vram(${vramHex} + 2 * ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE, actor_sc${scNum}_${actorNum}_f2_spr, ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE);\n`;
      }
      if (numFrames >= 4) {
        actCaseCode += `      load_vram(${vramHex} + 3 * ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE, actor_sc${scNum}_${actorNum}_f3_spr, ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE);\n`;
      }
      actCaseCode += `      load_palette(${16 + palIdx}, actor_sc${scNum}_${actorNum}_pal, 1);\n`;
      actCaseCode += `      g_actor_active[${actorNum}] = 1;\n`;
      actCaseCode += `      g_actor_tile_id[${actorNum}] = ${vramHex};\n`;
      actCaseCode += `      g_actor_base_tile_id[${actorNum}] = ${vramHex};\n`;
      actCaseCode += `      g_actor_frame_vram_size[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE;\n`;
      actCaseCode += `      g_actor_num_frames[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_NUM_FRAMES;\n`;
      actCaseCode += `      g_actor_anim_speed[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_ANIM_SPEED;\n`;
      actCaseCode += `      g_actor_anim_frame[${actorNum}] = 0;\n`;
      actCaseCode += `      g_actor_anim_timer[${actorNum}] = 0;\n`;
      actCaseCode += `      g_actor_palette[${actorNum}] = ${palIdx};\n`;
      actCaseCode += `      g_actor_size[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_SPRITE_SIZE;\n      g_actor_bbox_left[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_BBOX_LEFT;\n      g_actor_bbox_right[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_BBOX_RIGHT;\n      g_actor_bbox_top[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_BBOX_TOP;\n      g_actor_bbox_bottom[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_BBOX_BOTTOM;\n      actor_set_pos(${actorNum}, ACTOR_SCENE_${scNum}_${actorNum}_X, ACTOR_SCENE_${scNum}_${actorNum}_Y);\n`;
      actCaseCode += `      #ifdef ACTOR_SCENE_${scNum}_${actorNum}_HIDDEN\n`;
      actCaseCode += `      actor_hide(${actorNum});\n`;
      actCaseCode += `      #endif\n`;
      actCaseCode += `      #endif\n`;

      currentVram += 0x200;
    });

    actCaseCode += `      break;\n`;
    sceneActorCases += actCaseCode;
  });

  const sceneInitFunctionC = `#define HAS_SCENE_STEP_EVENTS 1
#define HAS_SCENE_INPUT_SCRIPTS 1
#define HAS_SCENE_STARTUP_SCRIPTS 1
#define HAS_INTERACT_ACTOR 1
#define HAS_SCENE_BACKGROUND 1
#define HAS_SCENE_MUSIC 1
#define HAS_SCENE_PLAYER_SPRITE 1
#define HAS_SCENE_ACTORS 1

${sceneStepHelpers}
${sceneInputCheckHelpers}
${sceneActorInteractHelpers}
int run_scene_step(int scene_num, int step) {
  int prev_sc;
  int res_step;
  prev_sc = g_script_scene;
  res_step = -1;
${sceneInitCases}
  if (g_script_scene != prev_sc) {
    return g_script_step;
  }
  return res_step;
}

int check_scene_input(int scene_num, unsigned int pressed) {
${sceneInputCheckCases}  return 0;
}

int scene_has_startup_script(int scene_num) {
${sceneStartupCases}  return 0;
}

int interact_actor(int scene_num, int actor_num) {
${sceneActorInteractCases}  return 0;
}

void load_scene_music(int scene_num) {
  switch (scene_num) {
${sceneMusicCases}    default:
      pce_sound_stop();
      break;
  }
}

void load_scene_player_sprite(int scene_num) {
  switch (scene_num) {
${scenePlayerSpriteCases}    default:
      break;
  }
}

void load_scene_background(int scene_num) {
  switch (scene_num) {
${sceneBackgroundCases}    default:
      break;
  }
}

void load_scene_actors(int scene_num) {
  switch (scene_num) {
${sceneActorCases}    default:
      g_actor_count = 1;
      break;
  }
}
`;

  let playerSprVramSizeHex = "0x40";
  let playerSprSizeConst = "SZ_16x16";
  if (playerSprWidth16 === 1 && playerSprHeight16 === 2) {
    playerSprVramSizeHex = "0x100";
    playerSprSizeConst = "SZ_16x32";
  } else if (playerSprWidth16 === 2 && playerSprHeight16 === 1) {
    playerSprVramSizeHex = "0x80";
    playerSprSizeConst = "SZ_32x16";
  } else if (playerSprWidth16 === 2 && playerSprHeight16 === 2) {
    playerSprVramSizeHex = "0x100";
    playerSprSizeConst = "SZ_32x32";
  } else if (playerSprWidth16 === 2 && playerSprHeight16 === 4) {
    playerSprVramSizeHex = "0x200";
    playerSprSizeConst = "SZ_32x64";
  } else if (playerSprWidth16 === 1 && playerSprHeight16 === 4) {
    playerSprVramSizeHex = "0x100";
    playerSprSizeConst = "SZ_16x64";
  }

  const mainCContent = `
#include <huc.h>

/* Scene type: must be defined BEFORE including engine.h */
${sceneTypeDefine}
#include "include/engine.h"

${playerDirectives}
#define HAS_PLAYER_4DIR 1
#define HAS_PLAYER_FRAME_1 1

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
