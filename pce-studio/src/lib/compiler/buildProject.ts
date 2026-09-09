import fs from "fs-extra";
import Path from "path";
import { convertPngToPcx, buildPngPalette, compositeMetaspriteFrame } from "./convertPngToPcx";
import { animationMapBySpriteType } from "shared/lib/sprites/helpers";
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
  POINTANDCLICK: 4,
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
  const defaultSpriteMode = settingsGbsData?.spriteMode || projectData?.settings?.spriteMode || (typeof projectDirPath === "object" ? projectDirPath?.settings?.spriteMode : undefined) || "8x16";

  // Load variables to map variable names to IDs
  const varMapByName = new Map<string, string>();
  const variablesGbsPath = pathModule.join(projDir, "project", "variables.gbsres");
  if (fs.existsSync(variablesGbsPath)) {
    try {
      const varData = fs.readJsonSync(variablesGbsPath);
      const vars = Array.isArray(varData?.variables) ? varData.variables : [];
      for (const v of vars) {
        if (v && v.name && v.id !== undefined) {
          const paddedId = String(v.id).padStart(2, "0");
          varMapByName.set(v.name, paddedId);
        }
      }
    } catch (e) { }
  } else if (Array.isArray(projectData?.variables)) {
    for (const v of projectData.variables) {
      if (v && v.name && v.id !== undefined) {
        const paddedId = String(v.id).padStart(2, "0");
        varMapByName.set(v.name, paddedId);
      }
    }
  }

  const formatDialogueTextForC = (input: string): string => {
    if (!input) return "";
    let str = input;
    if (varMapByName.size > 0) {
      for (const [varName, varId] of varMapByName.entries()) {
        const escapedName = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        str = str.replace(new RegExp(`\\$${escapedName}\\$`, "g"), `$${varId}$`);
        str = str.replace(new RegExp(`\\$${escapedName}\\b`, "g"), `$${varId}$`);
      }
    }
    str = str.replace(/!S\d!/g, "");
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
  };

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

  // Parse scene and actor gbsres files recursively
  let scenesFromGbsres: any[] = [];
  const scenesDir = pathModule.join(projDir, "project", "scenes");
  if (fs.existsSync(scenesDir)) {
    const findSceneDirs = (dir: string): string[] => {
      let results: string[] = [];
      if (!fs.existsSync(dir)) return results;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = pathModule.join(dir, entry.name);
        if (entry.isDirectory()) {
          const sceneGbs = pathModule.join(fullPath, "scene.gbsres");
          if (fs.existsSync(sceneGbs)) {
            results.push(fullPath);
          } else {
            results = results.concat(findSceneDirs(fullPath));
          }
        }
      }
      return results;
    };

    const sceneFolders = findSceneDirs(scenesDir);
    for (const scFolder of sceneFolders) {
      const sceneGbs = pathModule.join(scFolder, "scene.gbsres");
      if (fs.existsSync(sceneGbs)) {
        try {
          const json = fs.readJsonSync(sceneGbs);
          if (json) {
            const actorsDir = pathModule.join(scFolder, "actors");
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
            const triggersDir = pathModule.join(scFolder, "triggers");
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

  let platJumpBtnDefine = "(JOY_I | JOY_A)";
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
        } catch (e) { }
        break;
      }
    }

    scHeight = Math.min(64, scHeight);
    if (scHeight <= 32) {
      scWidth = Math.min(128, scWidth);
    } else {
      scWidth = Math.min(64, scWidth);
    }

    const scrSize = getPceScreenSize(scWidth, scHeight);
    sceneDimensions.push({ width: scWidth, height: scHeight, scrSize });

    const scType: string = (scene.type || "TOPDOWN").toUpperCase().replace(/[^A-Z]/g, "");
    const scTypeNum = SCENE_TYPE_MAP[scType] ?? SCENE_TYPE_MAP["TOPDOWN"];
    sceneTypeDefineList.push(`#define SCENE_${scNum}_TYPE ${scTypeNum}`);
    sceneTypeDefineList.push(`#define SCENE_${scNum}_WIDTH ${scWidth}`);
    sceneTypeDefineList.push(`#define SCENE_${scNum}_HEIGHT ${scHeight}`);
    sceneTypeDefineList.push(`#define SCENE_${scNum}_SCR_SIZE ${scrSize}`);
    sceneTypeDefineList.push(`#define HAS_SCENE_${scNum} 1`);
  });

  const firstType = (allScenes[0]?.type || "TOPDOWN").toUpperCase().replace(/[^A-Z]/g, "");
  const firstTypeNum = SCENE_TYPE_MAP[firstType] ?? SCENE_TYPE_MAP["TOPDOWN"];
  const sceneTypeDefine = sceneTypeDefineList.join("\n") + `\n#define SCENE_TYPE ${firstTypeNum}\n#define PLAT_WALK_SUBPX ${platWalkSubpx}\n#define PLAT_GRAVITY ${platGravitySubpx}\n#define PLAT_HOLD_GRAVITY ${platHoldGravitySubpx}\n#define PLAT_JUMP_SUBPX ${platJumpVelSubpx}\n#define PLAT_MAX_FALL ${platMaxFallSubpx}\n#define PLAT_JUMP_BTN ${platJumpBtnDefine}\n#define HAS_UI_FRAME 1\n`;

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
          } catch (e) { }
        }
      }
    }
  }

  const defaultScenePng = pathModule.join(destBgDir, "scene.png");
  if (!fs.existsSync(defaultScenePng)) {
    try {
      createBlankIndexedPng(defaultScenePng, 256, 224);
    } catch (e) { }
  }

  class RomBankManager {
    private currentBank: number;
    private currentOffset: number;
    private allocatedBanks = new Map<number, { owner: string; bytesUsed: number }>();

    constructor(startBank = 5) {
      this.currentBank = startBank;
      this.currentOffset = 0x6000;
    }

    allocateDedicatedBanks(numBanks: number, owner: string): { startBank: number; endBank: number } {
      if (this.currentOffset > 0x6000) {
        this.currentBank++;
        this.currentOffset = 0x6000;
      }
      const startBank = this.currentBank;
      for (let i = 0; i < numBanks; i++) {
        this.allocatedBanks.set(startBank + i, { owner, bytesUsed: 8192 });
      }
      this.currentBank += numBanks;
      this.currentOffset = 0x6000;
      return { startBank, endBank: startBank + numBanks - 1 };
    }

    allocatePacked(sizeInBytes: number, align = 1, owner = ""): { bank: number; offset: number; isNewBank: boolean } {
      if (align > 1) {
        const rem = this.currentOffset % align;
        if (rem !== 0) this.currentOffset += (align - rem);
      }
      let isNewBank = false;
      if (this.currentOffset + sizeInBytes > 0x8000) {
        this.currentBank++;
        this.currentOffset = 0x6000;
        isNewBank = true;
      }
      const bank = this.currentBank;
      const offset = this.currentOffset;
      this.currentOffset += sizeInBytes;

      const existing = this.allocatedBanks.get(bank) || { owner, bytesUsed: 0 };
      existing.bytesUsed = this.currentOffset - 0x6000;
      this.allocatedBanks.set(bank, existing);

      return { bank, offset, isNewBank };
    }

    sealCurrentBank(): void {
      if (this.currentOffset > 0x6000) {
        this.currentBank++;
        this.currentOffset = 0x6000;
      }
    }

    getMaxBank(): number {
      return this.currentBank;
    }
  }

  const bankManager = new RomBankManager(5);
  let bgAsmDirectives = "";
  const bgSymbolMap = new Map<string, string>();
  let bgUniqueIndex = 0;

  const getEstimatedChrBanks = (pngPath: string, dimW: number, dimH: number): number => {
    try {
      if (fs.existsSync(pngPath)) {
        const pngBuf = fs.readFileSync(pngPath);
        const { PNG } = require("pngjs");
        const png = PNG.sync.read(pngBuf);
        const uniqueTiles = new Set<string>();
        for (let ty = 0; ty < Math.min(png.height, dimH * 8); ty += 8) {
          for (let tx = 0; tx < Math.min(png.width, dimW * 8); tx += 8) {
            const tileBytes: number[] = [];
            for (let dy = 0; dy < 8; dy++) {
              for (let dx = 0; dx < 8; dx++) {
                const pIdx = ((ty + dy) * png.width + (tx + dx)) * 4;
                tileBytes.push(png.data[pIdx], png.data[pIdx + 1], png.data[pIdx + 2]);
              }
            }
            uniqueTiles.add(tileBytes.join(","));
          }
        }
        const numTiles = Math.max(1, uniqueTiles.size);
        return Math.max(1, Math.ceil((numTiles * 32 + 512) / 8192));
      }
    } catch (e) { }
    return Math.max(1, Math.ceil((dimW * dimH * 32 + 512) / 8192));
  };

  sceneBgFilenames.forEach((bgFile, idx) => {
    const scNum = idx + 1;
    const dim = sceneDimensions[idx] || { width: 32, height: 28 };
    const key = `${bgFile}|${dim.width}|${dim.height}`;

    if (!bgSymbolMap.has(key)) {
      const symPrefix = `bg_file_${bgUniqueIndex++}`;
      bgSymbolMap.set(key, symPrefix);

      const srcPngPath = pathModule.join(destBgDir, bgFile);
      const chrBanks = getEstimatedChrBanks(srcPngPath, dim.width, dim.height);
      const batBanks = Math.max(1, Math.ceil(((dim.width * dim.height * 2) + 512) / 8192));

      const chrAlloc = bankManager.allocateDedicatedBanks(chrBanks, `${symPrefix}_chr`);
      bgAsmDirectives += `\n .bank ${chrAlloc.startBank}\n .org $6000\n`;
      bgAsmDirectives += `_${symPrefix}_chr .incchr "assets/backgrounds/${bgFile}",0,0,${dim.width},${dim.height},1\n`;

      const batAlloc = bankManager.allocateDedicatedBanks(batBanks, `${symPrefix}_bat`);
      bgAsmDirectives += `\n .bank ${batAlloc.startBank}\n .org $6000\n`;
      bgAsmDirectives += `_${symPrefix}_pal .incpal "assets/backgrounds/${bgFile}"\n`;
      bgAsmDirectives += `_${symPrefix}_bat .incbat "assets/backgrounds/${bgFile}",$1000,0,0,${dim.width},${dim.height},_${symPrefix}_chr\n`;
    }

    const symPrefix = bgSymbolMap.get(key)!;
    bgAsmDirectives += `_bg_scene${scNum}_chr = _${symPrefix}_chr\n`;
    bgAsmDirectives += `_bg_scene${scNum}_pal = _${symPrefix}_pal\n`;
    bgAsmDirectives += `_bg_scene${scNum}_bat = _${symPrefix}_bat\n`;
  });

  const bgDirectives = `#asm\n .data\n${bgAsmDirectives} .code\n#endasm\n`;
  bankManager.sealCurrentBank();

  // Process UI frame.png
  const destUiDir = pathModule.join(buildDir, "assets", "ui");
  await fs.ensureDir(destUiDir);

  const uiDirsToScan = [
    pathModule.join(projDir, "assets", "ui"),
    pathModule.join(projDir, "project", "assets", "ui"),
    pathModule.join(projDir, "ui"),
    pathModule.join(__dirname, "..", "..", "..", "appData", "templates", "gbhtml", "assets", "ui"),
    pathModule.join(__dirname, "..", "..", "appData", "templates", "gbhtml", "assets", "ui"),
    pathModule.join(process.cwd(), "appData", "templates", "gbhtml", "assets", "ui"),
  ];

  let frameFound = false;
  const destFramePng = pathModule.join(destUiDir, "frame.png");

  for (const uDir of uiDirsToScan) {
    const srcFrame = pathModule.join(uDir, "frame.png");
    if (fs.existsSync(srcFrame)) {
      try {
        convertToIndexedPng(srcFrame, destFramePng);
      } catch (e) {
        await fs.copy(srcFrame, destFramePng, { overwrite: true });
      }
      frameFound = true;
      break;
    }
  }

  if (!frameFound) {
    try {
      createBlankIndexedPng(destFramePng, 24, 24);
    } catch (e) { }
  }

  const uiAlloc = bankManager.allocatePacked(9 * 32 + 512, 1, "ui_frame");
  const uiFrameDirectives = `
#asm
 .data
 .bank ${uiAlloc.bank}
 .org $${uiAlloc.offset.toString(16)}
#endasm
#incchr(ui_frame_chr, "assets/ui/frame.png", 0, 0, 3, 3)
#incpal(ui_frame_pal, "assets/ui/frame.png")
#asm
 .code
#endasm
`;

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
      const alloc = bankManager.allocatePacked(colBytes.length, 1, `col_${symName}`);
      if (alloc.isNewBank || colUniqueIndex === 1) {
        collisionIncludes += `\n#asm\n .data\n .bank ${alloc.bank}\n .org $${alloc.offset.toString(16)}\n#endasm\n`;
      }
      collisionIncludes += `#incbin(${symName}, "${colFileName}")\n`;
      collisionIncludes += `#define scene_${scNum}_collisions ${symName}\n`;
    } else {
      symName = colSymbolMap.get(key)!;
      collisionIncludes += `#define scene_${scNum}_collisions ${symName}\n`;
    }

    collisionIncludes += `#define HAS_SCENE_${scNum}_COLLISIONS 1\n`;
  });

  if (collisionIncludes) {
    collisionIncludes += `\n#asm\n .code\n#endasm\n`;
  }

  const parseNumber = (val: any, fallback: number) => {
    if (typeof val === "number" && !isNaN(val)) return Math.floor(val);
    if (typeof val === "object" && val !== null && typeof val.value === "number" && !isNaN(val.value)) return Math.floor(val.value);
    if (typeof val === "object" && val !== null && typeof val.x === "number" && !isNaN(val.x)) return Math.floor(val.x);
    if (typeof val === "string" && !isNaN(Number(val))) return Math.floor(Number(val));
    return fallback;
  };

  const parseCoord = (val: any, fallback: number) => {
    return parseNumber(val, fallback) * 8;
  };

  const sceneIdToNum: Record<string, number> = {};
  allScenes.forEach((scene: any, idx: number) => {
    if (scene.id) sceneIdToNum[scene.id] = idx + 1;
    if (scene.name) sceneIdToNum[scene.name] = idx + 1;
    if (scene.symbol) sceneIdToNum[scene.symbol] = idx + 1;
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
  // Also register all default player sprites per scene type from settings (PLATFORM, TOPDOWN, etc.)
  const defSpritesMap = projectData?.settings?.defaultPlayerSprites || settingsGbsData?.defaultPlayerSprites || projectDirPath?.settings?.defaultPlayerSprites;
  if (defSpritesMap && typeof defSpritesMap === "object") {
    Object.values(defSpritesMap).forEach((sId: any) => {
      if (typeof sId === "string" && sId) registerPlayerSprite(sId);
    });
  }

  // Also register topdown and platform fallback sprites
  const defaultTopdownSpr = allSprites.find((s: any) =>
    s.states?.[0]?.animationType === "multi_movement" ||
    s.states?.[0]?.animationType === "multi"
  );
  if (defaultTopdownSpr) registerPlayerSprite(defaultTopdownSpr.id);

  // Also register cursor fallback sprites for POINTNCLICK
  const defaultCursorSpr = allSprites.find((s: any) =>
    s.states?.[0]?.animationType === "cursor" ||
    (s.filename && /cursor|pointer|hand/i.test(s.filename))
  );
  if (defaultCursorSpr) registerPlayerSprite(defaultCursorSpr.id);

  allScenes.forEach((scene: any) => {
    let sheetId = scene.playerSpriteSheetId;
    if (!sheetId && defSpritesMap && typeof defSpritesMap === "object" && scene.type && defSpritesMap[scene.type]) {
      sheetId = defSpritesMap[scene.type];
    }
    if (!sheetId && (scene.type === "TOPDOWN" || scene.type === "ADVENTURE") && defaultTopdownSpr) {
      sheetId = defaultTopdownSpr.id;
    }
    if (!sheetId && scene.type === "POINTNCLICK" && defaultCursorSpr) {
      sheetId = defaultCursorSpr.id;
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
      const animType = sprObj?.states?.[0]?.animationType || "fixed";
      const flipLeft = sprObj?.states?.[0]?.flipLeft ?? true;
      const rawAnims = sprObj?.states?.[0]?.animations || [];

      // Map raw animation slots to the 8 logical slots:
      // 0: idleRight, 1: idleLeft, 2: idleUp, 3: idleDown,
      // 4: movingRight, 5: movingLeft, 6: movingUp, 7: movingDown
      const mappedAnims = animationMapBySpriteType(
        rawAnims,
        animType,
        flipLeft,
        (anim, flip) => ({ anim, flip })
      );

      const extractFrameInfo = (frame: any) => {
        if (!frame || !frame.tiles || !Array.isArray(frame.tiles)) return null;
        const tiles = frame.tiles.filter((t: any) => typeof t.sliceX === "number" && typeof t.sliceY === "number");
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

      const getFramesFromMapped = (mapped: { anim: any; flip: boolean } | undefined) => {
        if (!mapped || !mapped.anim || !Array.isArray(mapped.anim.frames)) return [];
        const res: { frame: any; cropX: number; cropY: number; flipX: boolean }[] = [];
        for (const f of mapped.anim.frames) {
          const info = extractFrameInfo(f);
          res.push({
            frame: f,
            cropX: info ? info.cropX : 0,
            cropY: info ? info.cropY : 0,
            flipX: mapped.flip ? (info ? !info.flipX : true) : (info ? info.flipX : false),
          });
        }
        return res;
      };

      const resolveDirectionFrames = (dirIdx: number, fallback?: { frame?: any; cropX: number; cropY: number; flipX: boolean }) => {
        if (animType === "cursor") {
          const idleAnim = rawAnims[0];
          const hoverAnim = rawAnims[1];
          const idleFrames = (idleAnim?.frames || []).map(extractFrameInfo).filter(Boolean);
          const hoverFrames = (hoverAnim?.frames || []).map(extractFrameInfo).filter(Boolean);
          const f0 = idleFrames[0] || (fallback || { frame: null, cropX: 0, cropY: 0, flipX: false });
          const f1 = hoverFrames[0] || idleFrames[1] || f0;
          return { f0, f1 };
        }

        const idleMapped = mappedAnims[dirIdx];
        const moveMapped = mappedAnims[dirIdx + 4];

        const idleFrames = getFramesFromMapped(idleMapped);
        const moveFrames = getFramesFromMapped(moveMapped);

        let f0: { frame?: any; cropX: number; cropY: number; flipX: boolean } | null = null;
        let f1: { frame?: any; cropX: number; cropY: number; flipX: boolean } | null = null;

        const isSameAnim = idleMapped?.anim && moveMapped?.anim && idleMapped.anim.id === moveMapped.anim.id;

        if (moveFrames.length >= 2) {
          if (idleFrames.length > 0 && !isSameAnim) {
            f0 = idleFrames[0];
            f1 = moveFrames.find(mf => mf.cropX !== f0!.cropX || mf.cropY !== f0!.cropY || mf.flipX !== f0!.flipX) || moveFrames[0];
          } else {
            f0 = moveFrames[0];
            f1 = moveFrames[1];
          }
        } else if (moveFrames.length === 1) {
          if (idleFrames.length >= 1) {
            f0 = idleFrames[0];
            if (!isSameAnim) {
              f1 = moveFrames[0];
            } else if (idleFrames.length >= 2) {
              f1 = idleFrames[1];
            } else {
              f1 = idleFrames[0];
            }
          } else {
            f0 = moveFrames[0];
            f1 = moveFrames[0];
          }
        } else if (idleFrames.length >= 2) {
          f0 = idleFrames[0];
          f1 = idleFrames[1];
        } else if (idleFrames.length === 1) {
          f0 = idleFrames[0];
          f1 = idleFrames[0];
        }

        const defFallback = fallback || { frame: null, cropX: 0, cropY: 0, flipX: false };
        return {
          f0: f0 || defFallback,
          f1: f1 || f0 || defFallback,
        };
      };

      const rightFrames = resolveDirectionFrames(0);
      const infoR0 = rightFrames.f0;
      const infoR1 = rightFrames.f1;

      const leftFrames = resolveDirectionFrames(1, { frame: infoR0.frame, cropX: infoR0.cropX, cropY: infoR0.cropY, flipX: !infoR0.flipX });
      const infoL0 = leftFrames.f0;
      const infoL1 = leftFrames.f1;

      const upFrames = resolveDirectionFrames(2, infoR0);
      const infoU0 = upFrames.f0;
      const infoU1 = upFrames.f1;

      const downFrames = resolveDirectionFrames(3, infoR0);
      const infoD0 = downFrames.f0;
      const infoD1 = downFrames.f1;

      const sharedPal = buildPngPalette(srcPng);

      const renderPlayerFramePcx = (info: any, destPcx: string) => {
        if (info?.frame?.tiles && Array.isArray(info.frame.tiles) && info.frame.tiles.length > 0) {
          const compPng = compositeMetaspriteFrame(srcPng, info.frame, origCropW, origCropH, padWidthTo, cropH, info.flipX, sprObj?.spriteMode || defaultSpriteMode);
          return convertPngToPcx(compPng, destPcx, { cropW: padWidthTo, cropH: cropH, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
        } else {
          return convertPngToPcx(srcPng, destPcx, { cropX: info.cropX, cropY: info.cropY, cropW: cropW, cropH: cropH, padWidthTo: padWidthTo, flipX: info.flipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
        }
      };

      const d_r0 = renderPlayerFramePcx(infoR0, destPcxR0);
      const d_r1 = renderPlayerFramePcx(infoR1, destPcxR1);
      const d_l0 = renderPlayerFramePcx(infoL0, destPcxL0);
      const d_l1 = renderPlayerFramePcx(infoL1, destPcxL1);
      const d_u0 = renderPlayerFramePcx(infoU0, destPcxU0);
      const d_u1 = renderPlayerFramePcx(infoU1, destPcxU1);
      const d_d0 = renderPlayerFramePcx(infoD0, destPcxD0);
      const d_d1 = renderPlayerFramePcx(infoD1, destPcxD1);

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

      const baseBytes = (8 * vramWidth16 * height16 * 128) + 512;
      const baseAlloc = bankManager.allocatePacked(baseBytes, 1, `player_${symPrefix}`);
      playerDirectives += `
#asm
 .data
 .bank ${baseAlloc.bank}
 .org $${baseAlloc.offset.toString(16)}
#endasm
#incspr(${symPrefix}_r0, "${relR0}", 0, 0, ${vramWidth16}, ${height16})
#incpal(${palName}, "${relR0}")
#incspr(${symPrefix}_r1, "${relR1}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_l0, "${relL0}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_l1, "${relL1}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_u0, "${relU0}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_u1, "${relU1}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_d0, "${relD0}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${symPrefix}_d1, "${relD1}", 0, 0, ${vramWidth16}, ${height16})
#asm
 .code
#endasm
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

      const extraStates = (sprObj?.states || []).slice(1);
      const compiledStates: { name: string; symPrefix: string; vramSizeHex: string; numFrames: number }[] = [];
      extraStates.forEach((st: any, sIdx: number) => {
        const stateName = (st.name || `state_${sIdx + 1}`).toLowerCase().replace(/[^a-z0-9_]/g, "");
        const stAnimType = st.animationType || "fixed";
        const stFlipLeft = st.flipLeft ?? true;
        const stRawAnims = st.animations || [];
        const stMapped = animationMapBySpriteType(
          stRawAnims,
          stAnimType,
          stFlipLeft,
          (anim, flip) => ({ anim, flip })
        );
        const chosen = stMapped[0] || { anim: stRawAnims[0], flip: false };
        let stateFrames: any[] = [];
        let stateFlip = chosen.flip;
        if (chosen.anim && Array.isArray(chosen.anim.frames) && chosen.anim.frames.length > 0) {
          stateFrames = chosen.anim.frames;
        }
        if (stateFrames.length === 0) return;

        const validFrames = stateFrames.filter((f: any) => f.tiles && f.tiles.length > 0);
        const framesToCompile = validFrames.length > 0 ? validFrames.slice(0, 8) : [stateFrames[0]];

        const stateSymPrefix = `${symPrefix}_${stateName}`;
        framesToCompile.forEach((frameObj: any, fIdx: number) => {
          const destPcxR = pathModule.join(destSpritesDir, `${filename.replace(/\.png$/i, "")}_${stateName}_r${fIdx}.pcx`);
          const destPcxL = pathModule.join(destSpritesDir, `${filename.replace(/\.png$/i, "")}_${stateName}_l${fIdx}.pcx`);

          const compR = compositeMetaspriteFrame(srcPng, frameObj, origCropW, origCropH, padWidthTo, cropH, stateFlip, sprObj?.spriteMode || defaultSpriteMode);
          const compL = compositeMetaspriteFrame(srcPng, frameObj, origCropW, origCropH, padWidthTo, cropH, !stateFlip, sprObj?.spriteMode || defaultSpriteMode);

          convertPngToPcx(compR, destPcxR, { cropW: padWidthTo, cropH, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
          convertPngToPcx(compL, destPcxL, { cropW: padWidthTo, cropH, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });

          const relPcxR = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxR).replace(/\\/g, "/")}`;
          const relPcxL = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxL).replace(/\\/g, "/")}`;

          const stateFrameBytes = 2 * (vramWidth16 * height16 * 128);
          const stateAlloc = bankManager.allocatePacked(stateFrameBytes, 1, `player_${stateSymPrefix}_f${fIdx}`);
          playerDirectives += `
#asm
 .data
 .bank ${stateAlloc.bank}
 .org $${stateAlloc.offset.toString(16)}
#endasm
#incspr(${stateSymPrefix}_r${fIdx}, "${relPcxR}", 0, 0, ${vramWidth16}, ${height16})
#incspr(${stateSymPrefix}_l${fIdx}, "${relPcxL}", 0, 0, ${vramWidth16}, ${height16})
#asm
 .code
#endasm
`;
        });

        compiledStates.push({ name: stateName, symPrefix: stateSymPrefix, vramSizeHex, numFrames: framesToCompile.length });
      });

      compiledPlayerSprites.set(key, { symPrefix, palName, width16, height16, filename, vramSizeHex, sizeConst, bboxLeft, bboxRight, bboxTop, bboxBottom, compiledStates });
    } catch (e) {
      console.error("Error converting player sprite frames to PCX:", e);
    }
  });

  // Build one small helper function per unique compiled player sprite, then
  // make the dispatcher's cases each just call the right helper. This keeps
  // every generated .PROC block well under the 8192-byte HuC assembler limit
  // regardless of how many scenes the project has.
  let playerSpriteHelpers = "";
  const emittedSpriteHelpers = new Set<string>();
  let scenePlayerSpriteCases = "";
  let scenePlayerSpriteStateCases = "";
  const firstCompiled = Array.from(compiledPlayerSprites.values())[0];

  // First pass: emit one helper per unique sprite
  compiledPlayerSprites.forEach((compiled: any) => {
    const helperName = `load_player_sprite_${compiled.symPrefix.replace(/^player_spr_/, "")}`;
    if (!emittedSpriteHelpers.has(helperName)) {
      emittedSpriteHelpers.add(helperName);
      playerSpriteHelpers += `void ${helperName}() {\n`;
      playerSpriteHelpers += `  g_player_spr_vram_size = ${compiled.vramSizeHex};\n`;
      playerSpriteHelpers += `  g_player_spr_size = ${compiled.sizeConst};\n`;
      playerSpriteHelpers += `  g_actor_size[0] = ${compiled.sizeConst};\n`;
      playerSpriteHelpers += `  g_player_bbox_left = ${compiled.bboxLeft};\n`;
      playerSpriteHelpers += `  g_player_bbox_right = ${compiled.bboxRight};\n`;
      playerSpriteHelpers += `  g_player_bbox_top = ${compiled.bboxTop};\n`;
      playerSpriteHelpers += `  g_player_bbox_bottom = ${compiled.bboxBottom};\n`;
      playerSpriteHelpers += `  g_actor_bbox_left[0] = ${compiled.bboxLeft};\n`;
      playerSpriteHelpers += `  g_actor_bbox_right[0] = ${compiled.bboxRight};\n`;
      playerSpriteHelpers += `  g_actor_bbox_top[0] = ${compiled.bboxTop};\n`;
      playerSpriteHelpers += `  g_actor_bbox_bottom[0] = ${compiled.bboxBottom};\n`;
      playerSpriteHelpers += `  load_vram(0x5000 + 0 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_r0, ${compiled.vramSizeHex});\n`;
      playerSpriteHelpers += `  load_vram(0x5000 + 1 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_r1, ${compiled.vramSizeHex});\n`;
      playerSpriteHelpers += `  load_vram(0x5000 + 2 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_l0, ${compiled.vramSizeHex});\n`;
      playerSpriteHelpers += `  load_vram(0x5000 + 3 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_l1, ${compiled.vramSizeHex});\n`;
      playerSpriteHelpers += `  load_vram(0x5000 + 4 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_u0, ${compiled.vramSizeHex});\n`;
      playerSpriteHelpers += `  load_vram(0x5000 + 5 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_u1, ${compiled.vramSizeHex});\n`;
      playerSpriteHelpers += `  load_vram(0x5000 + 6 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_d0, ${compiled.vramSizeHex});\n`;
      playerSpriteHelpers += `  load_vram(0x5000 + 7 * ${compiled.vramSizeHex}, ${compiled.symPrefix}_d1, ${compiled.vramSizeHex});\n`;
      playerSpriteHelpers += `  load_palette(16, ${compiled.palName}, 1);\n`;
      playerSpriteHelpers += `}\n\n`;
    }

    const stateHelperName = `load_player_sprite_${compiled.symPrefix.replace(/^player_spr_/, "")}_state`;
    if (!emittedSpriteHelpers.has(stateHelperName)) {
      emittedSpriteHelpers.add(stateHelperName);
      let stateLoadCode = "";
      if (compiled.compiledStates && compiled.compiledStates.length > 0) {
        compiled.compiledStates.forEach((st: any) => {
          stateLoadCode += `  g_actor_num_frames[0] = ${st.numFrames};\n`;
          stateLoadCode += `  if (dir == 1) {\n`;
          for (let f = 0; f < st.numFrames; f++) {
            stateLoadCode += `    load_vram(0x5000 + ${f} * ${st.vramSizeHex}, ${st.symPrefix}_l${f}, ${st.vramSizeHex});\n`;
          }
          stateLoadCode += `  } else {\n`;
          for (let f = 0; f < st.numFrames; f++) {
            stateLoadCode += `    load_vram(0x5000 + ${f} * ${st.vramSizeHex}, ${st.symPrefix}_r${f}, ${st.vramSizeHex});\n`;
          }
          stateLoadCode += `  }\n`;
        });
      }
      playerSpriteHelpers += `void ${stateHelperName}(int state, int dir) {\n${stateLoadCode}}\n\n`;
    }
  });

  // Second pass: build the dispatcher — each case is now a single helper call
  allScenes.forEach((scene: any, sceneIdx: number) => {
    const scNum = sceneIdx + 1;
    let sheetId = scene.playerSpriteSheetId;
    if (!sheetId && defSpritesMap && typeof defSpritesMap === "object" && scene.type && defSpritesMap[scene.type]) {
      sheetId = defSpritesMap[scene.type];
    }
    if (!sheetId && (scene.type === "TOPDOWN" || scene.type === "ADVENTURE") && defaultTopdownSpr) {
      sheetId = defaultTopdownSpr.id;
    }
    if (!sheetId && scene.type === "POINTNCLICK" && defaultCursorSpr) {
      sheetId = defaultCursorSpr.id;
    }
    sheetId = sheetId || defaultPlayerSpriteSheetId;
    const compiled = compiledPlayerSprites.get(String(sheetId)) || firstCompiled;
    if (compiled) {
      const helperName = `load_player_sprite_${compiled.symPrefix.replace(/^player_spr_/, "")}`;
      scenePlayerSpriteCases += `    case ${scNum}:\n      ${helperName}();\n      break;\n`;

      const stateHelperName = `load_player_sprite_${compiled.symPrefix.replace(/^player_spr_/, "")}_state`;
      scenePlayerSpriteStateCases += `    case ${scNum}:\n      ${stateHelperName}(state, dir);\n      break;\n`;
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
  let actorDirectivesStarted = false;
  let actorDefines = "";

  allScenes.forEach((scene: any, sceneIdx: number) => {
    const sceneNum = sceneIdx + 1;
    const sceneActors = scene.actors || [];

    const isPointNClick = (scene.type || "").toUpperCase().replace(/[^A-Z]/g, "") === "POINTNCLICK" || (scene.type || "").toUpperCase().replace(/[^A-Z]/g, "") === "POINTANDCLICK";
    const isPlayerHidden = !isPointNClick && checkActorHiddenState(scene, "player", true);
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

        const canvasW = sprObj?.canvasWidth || 16;
        const canvasH = sprObj?.canvasHeight || 16;
        const totalW16 = Math.max(1, Math.min(4, Math.ceil(canvasW / 16)));
        let origH16 = Math.max(1, Math.min(4, Math.ceil(canvasH / 16)));
        if (origH16 === 3) origH16 = 4;

        const isMultiPart = totalW16 > 2;
        const partCount = isMultiPart ? 2 : 1;
        const origW16 = isMultiPart ? 2 : totalW16;

        if (sprObj) {
          cropX = getCropXForActor(scActor, sprObj, canvasW);
        } else {
          cropX = getCropXForActor(scActor, null, 16);
        }

        let actVramW16 = (origH16 >= 2) ? 2 : origW16;
        cropW = canvasW;
        cropH = origH16 * 16;
        const padWidthTo = isMultiPart ? 64 : (actVramW16 * 16);
        const w16 = isMultiPart ? 2 : actVramW16;
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
        let actorFlipX = false;
        if (sprObj?.states?.[0]) {
          const animType = sprObj.states[0].animationType || "fixed";
          const flipLeft = sprObj.states[0].flipLeft ?? true;
          const rawAnims = sprObj.states[0].animations || [];
          const mapped = animationMapBySpriteType(
            rawAnims,
            animType,
            flipLeft,
            (anim, flip) => ({ anim, flip })
          );
          const dir = scActor?.direction?.toLowerCase() || "down";
          let dirSlot = 3;
          if (dir === "right") dirSlot = 0;
          else if (dir === "left") dirSlot = 1;
          else if (dir === "up") dirSlot = 2;

          const chosenMapped = mapped[dirSlot] || mapped[0];
          if (chosenMapped?.anim && Array.isArray(chosenMapped.anim.frames)) {
            actorAnimFrames = chosenMapped.anim.frames;
            actorFlipX = chosenMapped.flip;
          }
        }

        let maxAllowedFrames = 4;
        if (vramSizeHex === "0x40") maxAllowedFrames = 8;
        else if (vramSizeHex === "0x80" || vramSizeHex === "0x100") maxAllowedFrames = 4;
        else if (vramSizeHex === "0x200") maxAllowedFrames = 4;

        const numFrames = Math.max(1, Math.min(maxAllowedFrames, actorAnimFrames.length > 0 ? actorAnimFrames.length : 1));

        for (let fIdx = 0; fIdx < numFrames; fIdx++) {
          let fCropX = cropX;
          let fCropY = cropY;
          let tileFlipX = false;
          if (actorAnimFrames[fIdx]?.tiles && Array.isArray(actorAnimFrames[fIdx].tiles)) {
            const validTiles = actorAnimFrames[fIdx].tiles.filter((t: any) => typeof t.sliceX === "number" && typeof t.sliceY === "number");
            if (validTiles.length > 0) {
              let minX = 9999;
              let minY = 9999;
              validTiles.forEach((t: any) => {
                if (t.sliceX < minX) minX = t.sliceX;
                if (t.sliceY < minY) minY = t.sliceY;
                if (t.flipX) tileFlipX = true;
              });
              if (minX !== 9999 && minY !== 9999) {
                fCropX = minX;
                fCropY = minY;
              }
            }
          } else if (fIdx > 0) {
            fCropX = cropX + (fIdx * canvasW);
          }

          const finalFlipX = actorFlipX ? !tileFlipX : tileFlipX;
          const isMetasprite = actorAnimFrames[fIdx]?.tiles && Array.isArray(actorAnimFrames[fIdx].tiles) && actorAnimFrames[fIdx].tiles.length > 0;

          if (isMultiPart) {
            const destPcxF0 = pathModule.join(destSpritesDir, sprFilename.replace(/\.png$/i, `_sc${sceneNum}_${actorNum}_f${fIdx}_p0.pcx`));
            const destPcxF1 = pathModule.join(destSpritesDir, sprFilename.replace(/\.png$/i, `_sc${sceneNum}_${actorNum}_f${fIdx}_p1.pcx`));
            let compPng: any;
            if (isMetasprite) {
              compPng = compositeMetaspriteFrame(srcPng, actorAnimFrames[fIdx], canvasW, canvasH, 64, cropH, finalFlipX, sprObj?.spriteMode || defaultSpriteMode);
            } else {
              compPng = compositeMetaspriteFrame(srcPng, null, canvasW, canvasH, 64, cropH, finalFlipX, sprObj?.spriteMode || defaultSpriteMode);
            }
            convertPngToPcx(compPng, destPcxF0, { cropX: 0, cropY: 0, cropW: 32, cropH, padWidthTo: 32, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
            convertPngToPcx(compPng, destPcxF1, { cropX: 32, cropY: 0, cropW: 32, cropH, padWidthTo: 32, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });

            const relPcxF0 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxF0).replace(/\\/g, "/")}`;
            const relPcxF1 = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxF1).replace(/\\/g, "/")}`;
            const frameBytes = (2 * w16 * h16 * 128) + (fIdx === 0 ? 512 : 0);
            const alloc = bankManager.allocatePacked(frameBytes, 1, `actor_sc${sceneNum}_${actorNum}_f${fIdx}`);
            if (alloc.isNewBank || !actorDirectivesStarted) {
              actorDirectivesStarted = true;
              actorDirectives += `\n#asm\n .data\n .bank ${alloc.bank}\n .org $${alloc.offset.toString(16)}\n#endasm\n`;
            }
            actorDirectives += `#incspr(actor_sc${sceneNum}_${actorNum}_f${fIdx}_p0_spr, "${relPcxF0}", 0, 0, ${w16}, ${h16})\n`;
            actorDirectives += `#incspr(actor_sc${sceneNum}_${actorNum}_f${fIdx}_p1_spr, "${relPcxF1}", 0, 0, ${w16}, ${h16})\n`;
            if (fIdx === 0) {
              actorDirectives += `#incpal(actor_sc${sceneNum}_${actorNum}_pal, "${relPcxF0}")\n`;
              actorDefines += `#define actor_sc${sceneNum}_${actorNum}_p0_spr actor_sc${sceneNum}_${actorNum}_f0_p0_spr\n`;
              actorDefines += `#define actor_sc${sceneNum}_${actorNum}_p1_spr actor_sc${sceneNum}_${actorNum}_f0_p1_spr\n`;
              if (aIdx === 0) {
                actorDefines += `#define actor_sc${sceneNum}_p0_spr actor_sc${sceneNum}_${actorNum}_f0_p0_spr\n`;
                actorDefines += `#define actor_sc${sceneNum}_p1_spr actor_sc${sceneNum}_${actorNum}_f0_p1_spr\n`;
                actorDefines += `#define actor_sc${sceneNum}_pal actor_sc${sceneNum}_${actorNum}_pal\n`;
              }
            }
          } else {
            const destPcxF = pathModule.join(destSpritesDir, sprFilename.replace(/\.png$/i, `_sc${sceneNum}_${actorNum}_f${fIdx}.pcx`));
            if (isMetasprite) {
              const compPng = compositeMetaspriteFrame(srcPng, actorAnimFrames[fIdx], canvasW, canvasH, padWidthTo, cropH, finalFlipX, sprObj?.spriteMode || defaultSpriteMode);
              convertPngToPcx(compPng, destPcxF, { cropW: padWidthTo, cropH, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
            } else {
              convertPngToPcx(srcPng, destPcxF, { cropX: fCropX, cropY: fCropY, cropW, cropH, padWidthTo, flipX: finalFlipX, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });
            }

            const relPcxF = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxF).replace(/\\/g, "/")}`;
            const frameBytes = (w16 * h16 * 128) + (fIdx === 0 ? 512 : 0);
            const alloc = bankManager.allocatePacked(frameBytes, 1, `actor_sc${sceneNum}_${actorNum}_f${fIdx}`);
            if (alloc.isNewBank || !actorDirectivesStarted) {
              actorDirectivesStarted = true;
              actorDirectives += `\n#asm\n .data\n .bank ${alloc.bank}\n .org $${alloc.offset.toString(16)}\n#endasm\n`;
            }
            actorDirectives += `#incspr(actor_sc${sceneNum}_${actorNum}_f${fIdx}_spr, "${relPcxF}", 0, 0, ${w16}, ${h16})\n`;
            if (fIdx === 0) {
              actorDirectives += `#incpal(actor_sc${sceneNum}_${actorNum}_pal, "${relPcxF}")\n`;
              actorDefines += `#define actor_sc${sceneNum}_${actorNum}_spr actor_sc${sceneNum}_${actorNum}_f0_spr\n`;
              if (aIdx === 0) {
                actorDefines += `#define actor_sc${sceneNum}_spr actor_sc${sceneNum}_${actorNum}_f0_spr\n`;
                actorDefines += `#define actor_sc${sceneNum}_pal actor_sc${sceneNum}_${actorNum}_pal\n`;
              }
            }
          }
        }

        const actX = parseCoord(scActor.x, 8);
        const actY = parseCoord(scActor.y, 12) - (h16 * 16) + 8;
        let textDef = "";
        const actText = extractActorText(scActor);
        if (actText) {
          const cleanText = formatDialogueTextForC(actText);
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

        actorDefines += `#define HAS_ACTOR_SCENE_${sceneNum}_${actorNum} 1\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_X ${actX}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_Y ${actY}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_VRAM_SIZE ${vramSizeHex}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_SPRITE_SIZE ${sprSizeConst}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_PARTS ${partCount}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_NUM_FRAMES ${numFrames}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_ANIM_SPEED ${animSpeedVal}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_BBOX_LEFT ${actBBoxLeft}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_BBOX_RIGHT ${actBBoxRight}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_BBOX_TOP ${actBBoxTop}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_BBOX_BOTTOM ${actBBoxBottom}\n${textDef}${hiddenDef}${interactDefs}`;

        if (aIdx === 0) {
          actorDefines += `#define HAS_ACTOR_SCENE_${sceneNum} 1\n#define ACTOR_SCENE_${sceneNum}_X ${actX}\n#define ACTOR_SCENE_${sceneNum}_Y ${actY}\n#define ACTOR_SCENE_${sceneNum}_VRAM_SIZE ${vramSizeHex}\n#define ACTOR_SCENE_${sceneNum}_SPRITE_SIZE ${sprSizeConst}\n`;
        }
      } catch (e) {
        console.error(`Error processing Scene ${sceneNum} actor ${actorNum} sprite:`, e);
      }
    });
  });

  if (actorDirectives) {
    actorDirectives += `\n#asm\n .code\n#endasm\n`;
  }

  // Compile Projectile Sprites
  let projDirectives = "";
  const projectileSpriteIds = new Set<string>();
  const collectProjSprites = (events: any[]) => {
    if (!Array.isArray(events)) return;
    for (const evt of events) {
      if (!evt || typeof evt !== "object") continue;
      if (
        (evt.command === "EVENT_LAUNCH_PROJECTILE" || evt.command === "EVENT_LAUNCH_PROJECTILE_SLOT") &&
        evt.args?.spriteSheetId
      ) {
        projectileSpriteIds.add(String(evt.args.spriteSheetId));
      }
      if (evt.children && typeof evt.children === "object") {
        Object.values(evt.children).forEach((cList: any) => {
          if (Array.isArray(cList)) collectProjSprites(cList);
        });
      }
      if (evt.true && Array.isArray(evt.true)) collectProjSprites(evt.true);
      if (evt.false && Array.isArray(evt.false)) collectProjSprites(evt.false);
    }
  };

  allScenes.forEach((scene: any) => {
    collectProjSprites(scene.script);
    collectProjSprites(scene.startScript);
    (scene.actors || []).forEach((act: any) => {
      collectProjSprites(act.script);
      collectProjSprites(act.startScript);
      collectProjSprites(act.updateScript);
      collectProjSprites(act.hit1Script);
      collectProjSprites(act.hit2Script);
      collectProjSprites(act.hit3Script);
    });
    (scene.triggers || []).forEach((tr: any) => {
      collectProjSprites(tr.script);
    });
  });

  if (projectileSpriteIds.size === 0) {
    allSprites.filter((s: any) => s.name?.includes("bullet") || s.filename?.includes("bullet")).forEach((s: any) => {
      if (s.id) projectileSpriteIds.add(s.id);
    });
  }

  if (projectileSpriteIds.size > 0) {
    let projIdx = 0;
    for (const sprId of Array.from(projectileSpriteIds)) {
      let sprObj = allSprites.find((s: any) => s.id === sprId);
      if (!sprObj) continue;
      let sprFilename = sprObj.filename || `${sprObj.name || "bullet"}.png`;
      if (!sprFilename.endsWith(".png")) sprFilename += ".png";
      const srcPng = pathModule.join(projectSpritesDir, sprFilename);
      if (!fs.existsSync(srcPng)) continue;

      const destPcxF = pathModule.join(destSpritesDir, sprFilename.replace(/\.png$/i, `_proj_${projIdx}.pcx`));
      const sharedPal = buildPngPalette(srcPng);
      const canvasW = sprObj.canvasWidth || 16;
      const canvasH = sprObj.canvasHeight || 16;
      const w16 = Math.max(1, Math.min(2, Math.ceil(canvasW / 16)));
      let h16 = Math.max(1, Math.min(4, Math.ceil(canvasH / 16)));
      if (h16 === 3) h16 = 4;
      const padWidthTo = (h16 >= 2 ? 2 : w16) * 16;

      convertPngToPcx(srcPng, destPcxF, { cropX: 0, cropY: 0, cropW: canvasW, cropH: h16 * 16, padWidthTo, flipX: false, sharedPalette: sharedPal.palette, sharedColorMap: sharedPal.colorMap });

      const relPcxF = `assets/sprites/${pathModule.relative(pathModule.join(outputAssetsDir, "sprites"), destPcxF).replace(/\\/g, "/")}`;
      const projBytes = (w16 * h16 * 128) + 512;
      const alloc = bankManager.allocatePacked(projBytes, 1, `proj_${projIdx}`);
      if (alloc.isNewBank || projIdx === 0) {
        projDirectives += `\n#asm\n .data\n .bank ${alloc.bank}\n .org $${alloc.offset.toString(16)}\n#endasm\n`;
      }
      projDirectives += `#incspr(proj_spr_${projIdx}, "${relPcxF}", 0, 0, ${w16}, ${h16})\n#incpal(proj_pal_${projIdx}, "${relPcxF}")\n`;
      if (projIdx === 0) {
        projDirectives += `#define HAS_PROJECTILES 1\n#define proj_spr_default proj_spr_0\n#define proj_pal_default proj_pal_0\n`;
      }
      projIdx++;
    }
    if (projDirectives) {
      projDirectives += `\n#asm\n .code\n#endasm\n`;
    }
  }

  // Resolve Triggers
  const triggerRows: string[] = [];
  let globalTriggerCounter = 0;
  const sceneTriggerIndexMap = new Map<number, { globalIdx: number; trigger: any }[]>();

  const findSwitchCmd = (events: any[]): any => {
    if (!Array.isArray(events)) return null;
    for (const evt of events) {
      if (!evt) continue;
      if (evt.command === "EVENT_SWITCH_SCENE") return evt;
      if (evt.children) {
        for (const key of Object.keys(evt.children)) {
          if (Array.isArray(evt.children[key])) {
            const found = findSwitchCmd(evt.children[key]);
            if (found) return found;
          }
        }
      }
    }
    return null;
  };

  allScenes.forEach((scene: any, sceneIdx: number) => {
    const sceneNum = sceneIdx + 1;
    const sceneTriggers = (scene.triggers || []).map((tr: any) => {
      if (typeof tr === "string") {
        if (projectData?.triggers?.entities?.[tr]) return projectData.triggers.entities[tr];
        if (projectData?.triggers?.[tr]) return projectData.triggers[tr];
      }
      return tr;
    }).filter(Boolean);

    const list: { globalIdx: number; trigger: any }[] = [];

    sceneTriggers.forEach((tr: any) => {
      const globalIdx = globalTriggerCounter++;
      list.push({ globalIdx, trigger: tr });

      let targetScene = 0;
      let targetX = -1;
      let targetY = -1;

      const nonCommentEvents = (tr.script || []).filter((e: any) => e && e.command !== "EVENT_COMMENT");
      const isDirectSwitch = nonCommentEvents.length === 1 && nonCommentEvents[0].command === "EVENT_SWITCH_SCENE";

      if (isDirectSwitch) {
        const switchCmd = nonCommentEvents[0];
        if (switchCmd && switchCmd.args) {
          if (switchCmd.args.sceneId && sceneIdToNum[switchCmd.args.sceneId]) {
            targetScene = sceneIdToNum[switchCmd.args.sceneId];
          } else {
            targetScene = sceneNum === 1 ? 2 : 1;
          }
          targetX = parseCoord(switchCmd.args.x, 16);

          const targetSceneObj = (targetScene > 0 && targetScene <= allScenes.length) ? allScenes[targetScene - 1] : null;
          let targetSheetId = targetSceneObj?.playerSpriteSheetId;
          if (!targetSheetId && defSpritesMap && typeof defSpritesMap === "object" && targetSceneObj?.type && defSpritesMap[targetSceneObj.type]) {
            targetSheetId = defSpritesMap[targetSceneObj.type];
          }
          if (!targetSheetId && (targetSceneObj?.type === "TOPDOWN" || targetSceneObj?.type === "ADVENTURE") && defaultTopdownSpr) {
            targetSheetId = defaultTopdownSpr.id;
          }
          if (!targetSheetId && targetSceneObj?.type === "POINTNCLICK" && defaultCursorSpr) {
            targetSheetId = defaultCursorSpr.id;
          }
          targetSheetId = targetSheetId || defaultPlayerSpriteSheetId;
          const targetCompiled = compiledPlayerSprites.get(String(targetSheetId)) || firstCompiled;
          const targetSprHeight16 = targetCompiled?.height16 || 1;
          targetY = parseCoord(switchCmd.args.y, 16) - (targetSprHeight16 * 16) + 8;
        }
      }

      const tx = parseCoord(tr.x, 0);
      const ty = parseCoord(tr.y, 0);
      const tw = parseCoord(tr.width, 2);
      const th = parseCoord(tr.height, 2);

      triggerRows.push(`  ${sceneNum}, ${tx}, ${ty}, ${tw}, ${th}, ${targetScene}, ${targetX}, ${targetY}`);
    });

    sceneTriggerIndexMap.set(sceneNum, list);
  });

  let triggerDefines = "";
  if (triggerRows.length > 0) {
    triggerDefines = `#define HAS_TRIGGER_TABLE 1\n#define TRIGGER_COUNT ${triggerRows.length}\nconst int g_trigger_table[] = {\n${triggerRows.join(",\n")}\n};\n`;
  }

  // Look for music tracks (.uge files) and build symbol mapping BEFORE processing scene steps
  let musicIncludes = "";
  let hasMusicDef = "";
  let startMusicDef = "";
  let initMusicAsm = "";
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
      const { loadUGESong, exportToAsm } = require("shared/lib/uge/ugeHelper");
      const ugeBuf = await fs.readFile(ugePath);
      const song = loadUGESong(ugeBuf);
      if (song) {
        const songAlloc = bankManager.allocateDedicatedBanks(1, `song_${symbol}`);
        const songBank = songAlloc.startBank;
        const musicAsm = exportToAsm(song, symbol, songBank);
        const musicOutDir = pathModule.join(buildDir, "music");
        await fs.ensureDir(musicOutDir);
        await fs.writeFile(pathModule.join(musicOutDir, `${symbol}.s`), musicAsm, "utf8");
        musicIncludes += `#asm\n .include "music/${symbol}.s"\n#endasm\nunsigned int *${symbol}_Data;\n`;
        initMusicAsm += `    lda #low(_${symbol}_Data_raw)\n    sta _${symbol}_Data\n    lda #high(_${symbol}_Data_raw)\n    sta _${symbol}_Data+1\n`;
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

  for (const sc of allScenes) {
    const events = [
      ...(Array.isArray(sc.script) ? sc.script : []),
      ...(Array.isArray(sc.startScript) ? sc.startScript : []),
      ...(sc.actors || []).flatMap((act: any) => [
        ...(Array.isArray(act.script) ? act.script : []),
        ...(Array.isArray(act.startScript) ? act.startScript : []),
        ...(Array.isArray(act.updateScript) ? act.updateScript : [])
      ]),
      ...(sc.triggers || []).flatMap((trig: any) => [
        ...(Array.isArray(trig.script) ? trig.script : []),
        ...(Array.isArray(trig.leaveScript) ? trig.leaveScript : [])
      ])
    ];
    checkEvts(events);
  }

  if (projectData.customEvents && Array.isArray(projectData.customEvents)) {
    for (const ce of projectData.customEvents) {
      if (ce.script) checkEvts(ce.script);
    }
  }

  // Compile only music tracks actually called in the game
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
      if (s === "any") mask |= 0xFF;
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
    if (typeof vArg === "object" && vArg !== null) {
      if (vArg.value !== undefined) return parseVarIndex(vArg.value);
    }
    return 0;
  };

  const parseValueExpr = (valArg: any, currentActorNum: number = 0, scene?: any): string => {
    if (valArg === undefined || valArg === null) return "0";
    if (typeof valArg === "number") return String(valArg);
    if (typeof valArg === "boolean") return valArg ? "1" : "0";
    if (typeof valArg === "string") {
      if (valArg === "true") return "1";
      if (valArg === "false") return "0";
      const n = Number(valArg);
      return isNaN(n) ? "0" : String(n);
    }
    if (typeof valArg === "object") {
      if (valArg.type === "true") return "1";
      if (valArg.type === "false") return "0";
      if (valArg.type === "number") return String(typeof valArg.value === "number" ? valArg.value : (Number(valArg.value) || 0));
      if (valArg.type === "variable") return `vm_get_var(${parseVarIndex(valArg.value)})`;
      if (valArg.type === "property") {
        let propTarget = currentActorNum;
        if (valArg.target === "player") propTarget = 0;
        else if (valArg.target && valArg.target !== "$self$" && scene?.actors) {
          const tIdx = scene.actors.findIndex((a: any) => a.id === valArg.target);
          if (tIdx !== -1) propTarget = tIdx + 1;
        }
        const propName = String(valArg.property || "").toLowerCase();
        if (propName === "xpos") return `(g_actor_x[${propTarget}] >> 3)`;
        if (propName === "ypos") return `(g_actor_y[${propTarget}] >> 3)`;
        if (propName === "pxpos") return `g_actor_x[${propTarget}]`;
        if (propName === "pypos") return `g_actor_y[${propTarget}]`;
        if (propName === "direction") return `g_actor_dir[${propTarget}]`;
        if (propName === "frame") return `g_actor_anim_frame[${propTarget}]`;
      }
      if (valArg.value !== undefined) return parseValueExpr(valArg.value, currentActorNum, scene);
    }
    return "0";
  };

  const parseConditionExpr = (evt: any): string => {
    const cond = evt.args?.condition;
    const varIdx = parseVarIndex(evt.args?.variable);
    const isFalseCheck = (evt.command === "EVENT_IF_FALSE" || evt.command === "EVENT_IF_VARIABLE_FALSE");

    if (cond && typeof cond === "object") {
      if (cond.type === "variable") {
        return `(vm_get_var(${parseVarIndex(cond.value)}) != 0)`;
      }
      if (cond.type === "not") {
        if (cond.value?.type === "variable") {
          return `(vm_get_var(${parseVarIndex(cond.value.value)}) == 0)`;
        }
        return `(!${parseValueExpr(cond.value)})`;
      }
      if (cond.type === "eq") {
        return `(${parseValueExpr(cond.valueA)} == ${parseValueExpr(cond.valueB)})`;
      }
      if (cond.type === "ne") {
        return `(${parseValueExpr(cond.valueA)} != ${parseValueExpr(cond.valueB)})`;
      }
      if (cond.type === "gt") {
        return `(${parseValueExpr(cond.valueA)} > ${parseValueExpr(cond.valueB)})`;
      }
      if (cond.type === "gte") {
        return `(${parseValueExpr(cond.valueA)} >= ${parseValueExpr(cond.valueB)})`;
      }
      if (cond.type === "lt") {
        return `(${parseValueExpr(cond.valueA)} < ${parseValueExpr(cond.valueB)})`;
      }
      if (cond.type === "lte") {
        return `(${parseValueExpr(cond.valueA)} <= ${parseValueExpr(cond.valueB)})`;
      }
      if (cond.type === "true") return "(1)";
      if (cond.type === "false") return "(0)";
    }

    if (evt.args?.operator) {
      const op = evt.args.operator;
      const rhs = parseValueExpr(evt.args.value ?? evt.args.otherVariable);
      if (op === "==" || op === "eq") return `(vm_get_var(${varIdx}) == ${rhs})`;
      if (op === "!=" || op === "ne") return `(vm_get_var(${varIdx}) != ${rhs})`;
      if (op === ">" || op === "gt") return `(vm_get_var(${varIdx}) > ${rhs})`;
      if (op === "<" || op === "lt") return `(vm_get_var(${varIdx}) < ${rhs})`;
      if (op === ">=" || op === "gte") return `(vm_get_var(${varIdx}) >= ${rhs})`;
      if (op === "<=" || op === "lte") return `(vm_get_var(${varIdx}) <= ${rhs})`;
    }

    return isFalseCheck ? `(vm_get_var(${varIdx}) == 0)` : `(vm_get_var(${varIdx}) != 0)`;
  };

  let sceneStepHelpers = "";
  let sceneInitCases = "";
  let sceneInputCheckHelpers = "";
  let sceneInputCheckCases = "";
  let sceneStartupCases = "";
  let sceneActorInteractHelpers = "";
  let sceneActorInteractCases = "";
  let sceneTriggerInteractHelpers = "";
  let sceneTriggerInteractCases = "";
  let sceneActorUpdateHelpers = "";
  let sceneActorUpdateCases = "";

  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const scTriggers = sceneTriggerIndexMap.get(scNum) || [];
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

    const parseCoordExpr = (valArg: any, fallbackTiles: number, currentActorNum: number = 0, units: string = "tiles"): string => {
      if (valArg === undefined || valArg === null) return String(fallbackTiles * 8);
      if (typeof valArg === "number") {
        return String(units === "pixels" ? Math.floor(valArg) : Math.floor(valArg) * 8);
      }
      if (typeof valArg === "string" && !isNaN(Number(valArg))) {
        const n = Number(valArg);
        return String(units === "pixels" ? Math.floor(n) : Math.floor(n) * 8);
      }
      if (typeof valArg === "object" && valArg !== null) {
        if (valArg.type === "number") {
          const num = typeof valArg.value === "number" ? valArg.value : (Number(valArg.value) || fallbackTiles);
          return String(units === "pixels" ? Math.floor(num) : Math.floor(num) * 8);
        }
        if (valArg.type === "variable") {
          const vIdx = parseVarIndex(valArg.value);
          return units === "pixels" ? `vm_get_var(${vIdx})` : `(vm_get_var(${vIdx}) * 8)`;
        }
        if (valArg.type === "property") {
          const propTarget = findTargetNum(valArg.target, currentActorNum);
          const propName = String(valArg.property || "").toLowerCase();
          if (propName === "xpos" || propName === "pxpos") return `g_actor_x[${propTarget}]`;
          if (propName === "ypos" || propName === "pypos") return `g_actor_y[${propTarget}]`;
        }
        if (valArg.value !== undefined) return parseCoordExpr(valArg.value, fallbackTiles, currentActorNum, units);
      }
      return String(fallbackTiles * 8);
    };

    const compileEventSequence = (evts: any[], isStartupContext = false, currentActorNum = 0, isUpdateScript = false) => {
      let stepIndex = 0;
      let stepCases = "";

      const processEventList = (eventsToCompile: any[], isAtEnd = false) => {
        if (!Array.isArray(eventsToCompile)) return;
        for (let i = 0; i < eventsToCompile.length; i++) {
          const evt = eventsToCompile[i];
          if (!evt || typeof evt !== "object" || evt.args?.__comment) continue;
          const isLastEvent = isAtEnd && (i === eventsToCompile.length - 1);

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
              const cleanText = formatDialogueTextForC(textVal);
              stepCases += `      case ${stepIndex}:\n        show_dialogue("${cleanText}");\n        return ${stepIndex + 1};\n`;
              stepIndex++;
            }
          } else if (evt.command === "EVENT_WAIT") {
            let seconds = 1;
            if (typeof evt.args?.time === "number") seconds = evt.args.time;
            else if (typeof evt.args?.time === "object" && evt.args?.time?.value !== undefined) seconds = Number(evt.args.time.value);
            const frames = Math.max(1, Math.round(seconds * 60));
            if (isUpdateScript && currentActorNum > 0) {
              stepCases += `      case ${stepIndex}:\n        g_actor_wait_timer[${currentActorNum}] = ${frames};\n        return ${stepIndex + 1};\n`;
            } else {
              stepCases += `      case ${stepIndex}:\n        g_wait_timer = ${frames};\n        return ${stepIndex + 1};\n`;
            }
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
            const targetSceneObj = (targetScene > 0 && targetScene <= allScenes.length) ? allScenes[targetScene - 1] : null;
            let targetSheetId = targetSceneObj?.playerSpriteSheetId;
            if (!targetSheetId && defSpritesMap && typeof defSpritesMap === "object" && targetSceneObj?.type && defSpritesMap[targetSceneObj.type]) {
              targetSheetId = defSpritesMap[targetSceneObj.type];
            }
            if (!targetSheetId && (targetSceneObj?.type === "TOPDOWN" || targetSceneObj?.type === "ADVENTURE") && defaultTopdownSpr) {
              targetSheetId = defaultTopdownSpr.id;
            }
            if (!targetSheetId && targetSceneObj?.type === "POINTNCLICK" && defaultCursorSpr) {
              targetSheetId = defaultCursorSpr.id;
            }
            targetSheetId = targetSheetId || defaultPlayerSpriteSheetId;
            const targetCompiled = compiledPlayerSprites.get(String(targetSheetId)) || firstCompiled;
            const targetSprHeight16 = targetCompiled?.height16 || 1;

            const targetX = parseCoord(evt.args?.x, 0);
            const targetY = parseCoord(evt.args?.y, 0) - (targetSprHeight16 * 16) + 8;

            stepCases += `      case ${stepIndex}:\n        load_scene(${targetScene}, ${targetX}, ${targetY});\n        return -1;\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_MUSIC_PLAY" || evt.command === "EVENT_PLAY_MUSIC") {
            const musicId = evt.args?.musicId || evt.args?.music;
            let songSymbol = "";
            if (musicId && musicIdMap[musicId] && compiledTrackSymbols.includes(musicIdMap[musicId].symbol)) {
              songSymbol = musicIdMap[musicId].symbol;
            } else if (musicId && musicByFilenameMap[musicId] && compiledTrackSymbols.includes(musicByFilenameMap[musicId].symbol)) {
              songSymbol = musicByFilenameMap[musicId].symbol;
            } else if (musicId && musicBySymbolMap[musicId] && compiledTrackSymbols.includes(musicId)) {
              songSymbol = musicId;
            } else if (scene.musicId && musicIdMap[scene.musicId] && compiledTrackSymbols.includes(musicIdMap[scene.musicId].symbol)) {
              songSymbol = musicIdMap[scene.musicId].symbol;
            } else if (compiledTrackSymbols.length > 0) {
              songSymbol = compiledTrackSymbols[0];
            } else {
              songSymbol = "song_0";
            }
            stepCases += `      case ${stepIndex}:\n#ifdef HAS_MUSIC_DATA\n        pce_sound_play(${songSymbol}_Data);\n#endif\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (
            evt.command === "EVENT_ACTOR_SHOW" ||
            evt.command === "EVENT_ACTOR_ACTIVATE" ||
            evt.command === "EVENT_PLAYER_ACTIVATE" ||
            evt.command === "EVENT_PLAYER_SHOW"
          ) {
            const targetNum = (evt.command === "EVENT_PLAYER_ACTIVATE" || evt.command === "EVENT_PLAYER_SHOW") ? 0 : findTargetNum(evt.args?.actorId, currentActorNum);
            stepCases += `      case ${stepIndex}:\n        actor_show(${targetNum});\n        actor_activate(${targetNum});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (
            evt.command === "EVENT_ACTOR_HIDE" ||
            evt.command === "EVENT_ACTOR_DEACTIVATE" ||
            evt.command === "EVENT_PLAYER_DEACTIVATE" ||
            evt.command === "EVENT_PLAYER_HIDE"
          ) {
            const targetNum = (evt.command === "EVENT_PLAYER_DEACTIVATE" || evt.command === "EVENT_PLAYER_HIDE") ? 0 : findTargetNum(evt.args?.actorId, currentActorNum);
            stepCases += `      case ${stepIndex}:\n        actor_hide(${targetNum});\n        actor_deactivate(${targetNum});\n        return ${stepIndex + 1};\n`;
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
            const units = evt.args?.units === "pixels" ? "pixels" : "tiles";
            const px = parseCoordExpr(evt.args?.x, 0, currentActorNum, units);
            const py = parseCoordExpr(evt.args?.y, 0, currentActorNum, units);
            stepCases += `      case ${stepIndex}:\n        if (!actor_move_step(${targetNum}, ${px}, ${py})) return ${stepIndex};\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_ACTOR_MOVE_RELATIVE") {
            const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
            const units = evt.args?.units === "pixels" ? "pixels" : "tiles";
            const dx = parseCoordExpr(evt.args?.x, 0, currentActorNum, units);
            const dy = parseCoordExpr(evt.args?.y, 0, currentActorNum, units);
            stepCases += `      case ${stepIndex}:\n        if (!actor_move_rel_step(${targetNum}, ${dx}, ${dy})) return ${stepIndex};\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_ACTOR_SET_DIRECTION" || evt.command === "EVENT_ACTOR_SET_DIRECTION_TO_VALUE") {
            const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
            const dVal = (typeof evt.args?.direction === "object" && evt.args?.direction !== null && evt.args?.direction?.value !== undefined) ? evt.args.direction.value : evt.args?.direction;
            const dStr = String(dVal || "down").toLowerCase();
            let dNum = 3;
            if (dStr === "right") dNum = 0;
            else if (dStr === "left") dNum = 1;
            else if (dStr === "up") dNum = 2;
            stepCases += `      case ${stepIndex}:\n        actor_set_dir(${targetNum}, ${dNum});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_ACTOR_SET_MOVEMENT_SPEED") {
            const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
            const spd = parseNumber(evt.args?.speed, 1);
            stepCases += `      case ${stepIndex}:\n        actor_set_move_speed(${targetNum}, ${spd});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_ACTOR_SET_ANIMATION_SPEED") {
            const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
            const spd = parseNumber(evt.args?.speed, 1);
            stepCases += `      case ${stepIndex}:\n        actor_set_anim_speed(${targetNum}, ${spd});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_ACTOR_SET_FRAME" || evt.command === "EVENT_ACTOR_SET_FRAME_TO_VALUE") {
            const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
            const frm = parseNumber(evt.args?.frame, 0);
            stepCases += `      case ${stepIndex}:\n        actor_set_frame(${targetNum}, ${frm});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_ACTOR_EMOTE") {
            const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
            const emoteId = parseNumber(evt.args?.emoteId, 0);
            stepCases += `      case ${stepIndex}:\n        actor_emote(${targetNum}, ${emoteId});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_ACTOR_PUSH") {
            const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
            const slide = (evt.args?.continue === true || evt.args?.slide === true) ? 1 : 0;
            stepCases += `      case ${stepIndex}:\n        actor_push(${targetNum}, g_actor_dir[0], ${slide});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_CAMERA_MOVE_TO" || evt.command === "EVENT_CAMERA_SET_POSITION") {
            const cx = parseCoord(evt.args?.x, 0);
            const cy = parseCoord(evt.args?.y, 0);
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
          } else if (
            evt.command === "EVENT_TEXT" ||
            evt.command === "EVENT_TEXT_DIALOGUE" ||
            evt.command === "EVENT_SHOW_TEXT"
          ) {
            const rawText = Array.isArray(evt.args?.text)
              ? evt.args.text.join("\n")
              : (typeof evt.args?.text === "string" ? evt.args.text : "");
            const cleanText = formatDialogueTextForC(rawText);
            stepCases += `      case ${stepIndex}:\n        show_dialogue("${cleanText}");\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_CHOICE") {
            const varIdx = parseVarIndex(evt.args?.variable);
            const trueText = formatDialogueTextForC(String(evt.args?.trueText || "Yes")).replace(/\\n/g, " ");
            const falseText = formatDialogueTextForC(String(evt.args?.falseText || "No")).replace(/\\n/g, " ");
            stepCases += `      case ${stepIndex}:\n        show_choice(${varIdx}, "${trueText}", "${falseText}");\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_MENU") {
            const varIdx = parseVarIndex(evt.args?.variable);
            const items = Math.max(2, Math.min(4, Number(evt.args?.items) || 2));
            const opt1 = formatDialogueTextForC(String(evt.args?.option1 || "Option 1")).replace(/\\n/g, " ");
            const opt2 = formatDialogueTextForC(String(evt.args?.option2 || "Option 2")).replace(/\\n/g, " ");
            const opt3 = formatDialogueTextForC(String(evt.args?.option3 || "Option 3")).replace(/\\n/g, " ");
            const opt4 = formatDialogueTextForC(String(evt.args?.option4 || "Option 4")).replace(/\\n/g, " ");
            const cancelB = evt.args?.cancelOnB !== false ? 1 : 0;
            stepCases += `      case ${stepIndex}:\n        show_menu(${varIdx}, ${items}, "${opt1}", "${opt2}", "${opt3}", "${opt4}", ${cancelB});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (
            evt.command === "EVENT_SET_VALUE" ||
            evt.command === "EVENT_VARIABLE_SET_TO_VALUE" ||
            evt.command === "EVENT_SET_VARIABLE"
          ) {
            const varIdx = parseVarIndex(evt.args?.variable);
            const valExpr = parseValueExpr(evt.args?.value);
            stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, ${valExpr});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (
            evt.command === "EVENT_SET_TRUE" ||
            evt.command === "EVENT_VARIABLE_SET_TO_TRUE"
          ) {
            const varIdx = parseVarIndex(evt.args?.variable);
            stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, 1);\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (
            evt.command === "EVENT_SET_FALSE" ||
            evt.command === "EVENT_VARIABLE_SET_TO_FALSE"
          ) {
            const varIdx = parseVarIndex(evt.args?.variable);
            stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, 0);\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (
            evt.command === "EVENT_COPY_VALUE" ||
            evt.command === "EVENT_VARIABLE_COPY"
          ) {
            const varIdx = parseVarIndex(evt.args?.variable);
            const otherIdx = parseVarIndex(evt.args?.otherVariable);
            stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, vm_get_var(${otherIdx}));\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (
            evt.command === "EVENT_RESET_VARIABLES" ||
            evt.command === "EVENT_VARIABLES_RESET"
          ) {
            stepCases += `      case ${stepIndex}:\n        vm_init();\n        return ${stepIndex + 1};\n`;
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
            evt.command === "EVENT_IF_VARIABLE_COMPARE" ||
            evt.command === "EVENT_IF_EXPRESSION" ||
            evt.command === "EVENT_IF_ENGINE_FIELD" ||
            evt.command === "EVENT_IF_ENGINE_FIELD_COMPARE"
          ) {
            const condExpr = parseConditionExpr(evt);

            const trueList = (evt.true && Array.isArray(evt.true)) ? evt.true : (evt.children?.true && Array.isArray(evt.children.true) ? evt.children.true : []);
            const falseList = (evt.false && Array.isArray(evt.false)) ? evt.false : (evt.children?.false && Array.isArray(evt.children.false) ? evt.children.false : []);

            const branchStep = stepIndex;
            stepIndex++;

            const trueStart = stepIndex;
            processEventList(trueList, isLastEvent);
            const trueEndJumpStep = stepIndex;
            stepIndex++;

            let falseStart = -1;
            if (falseList.length > 0) {
              falseStart = stepIndex;
              processEventList(falseList, isLastEvent);
            }
            const afterStep = stepIndex;

            const falseTarget = (falseList.length > 0) ? falseStart : (isLastEvent ? -1 : afterStep);
            const trueEndTarget = isLastEvent ? -1 : afterStep;

            stepCases += `      case ${branchStep}:\n        if ${condExpr} return ${trueStart};\n        else return ${falseTarget};\n`;
            stepCases += `      case ${trueEndJumpStep}:\n        return ${trueEndTarget};\n`;
            continue;
          } else if (
            evt.command === "EVENT_IF_INPUT" ||
            evt.command === "EVENT_IF_INPUT_HELD" ||
            evt.command === "EVENT_IF_BUTTON_HELD" ||
            evt.command === "EVENT_IF_BUTTON_PRESSED" ||
            evt.command === "EVENT_IF_JOYPAD_PRESSED"
          ) {
            const mask = parseInputButtonMask(evt.args?.input);
            const maskHex = `0x${mask.toString(16).toUpperCase().padStart(2, "0")}`;
            const condExpr = `((pce_sys_read_joy(0) & ${maskHex}) != 0)`;

            const trueList = (evt.true && Array.isArray(evt.true)) ? evt.true : (evt.children?.true && Array.isArray(evt.children.true) ? evt.children.true : []);
            const falseList = (evt.false && Array.isArray(evt.false)) ? evt.false : (evt.children?.false && Array.isArray(evt.children.false) ? evt.children.false : []);

            const branchStep = stepIndex;
            stepIndex++;

            const trueStart = stepIndex;
            processEventList(trueList, isLastEvent);
            const trueEndJumpStep = stepIndex;
            stepIndex++;

            let falseStart = -1;
            if (falseList.length > 0) {
              falseStart = stepIndex;
              processEventList(falseList, isLastEvent);
            }
            const afterStep = stepIndex;

            const falseTarget = (falseList.length > 0) ? falseStart : (isLastEvent ? -1 : afterStep);
            const trueEndTarget = isLastEvent ? -1 : afterStep;

            stepCases += `      case ${branchStep}:\n        if ${condExpr} return ${trueStart};\n        else return ${falseTarget};\n`;
            stepCases += `      case ${trueEndJumpStep}:\n        return ${trueEndTarget};\n`;
            continue;
          } else if (evt.command === "EVENT_DIALOGUE_CLOSE_NONMODAL") {
            stepCases += `      case ${stepIndex}:\n        hide_dialogue();\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_HIDE_SPRITES" || evt.command === "EVENT_SPRITES_HIDE") {
            stepCases += `      case ${stepIndex}:\n        actor_hide_all();\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_SHOW_SPRITES" || evt.command === "EVENT_SPRITES_SHOW") {
            stepCases += `      case ${stepIndex}:\n        actor_show_all();\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_MUSIC_STOP") {
            stepCases += `      case ${stepIndex}:\n        pce_sound_stop();\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_MATH_ADD" || evt.command === "EVENT_MATH_ADD_VALUE") {
            const varIdx = parseVarIndex(evt.args?.variable);
            const valExpr = parseValueExpr(evt.args?.value);
            stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, vm_get_var(${varIdx}) + ${valExpr});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_MATH_SUB" || evt.command === "EVENT_MATH_SUB_VALUE") {
            const varIdx = parseVarIndex(evt.args?.variable);
            const valExpr = parseValueExpr(evt.args?.value);
            stepCases += `      case ${stepIndex}:\n        vm_set_var(${varIdx}, vm_get_var(${varIdx}) - ${valExpr});\n        return ${stepIndex + 1};\n`;
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
            processEventList(loopBody, false);
            const loopEnd = stepIndex;
            stepCases += `      case ${loopEnd}:\n        return ${loopStart};\n`;
            stepIndex++;
            continue;
          } else if (evt.command === "EVENT_LOOP_BREAK" || evt.command === "EVENT_BREAK") {
            stepCases += `      case ${stepIndex}:\n        return -1;\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_SAVE_DATA" || evt.command === "EVENT_DATA_SAVE") {
            const slot = Number(evt.args?.saveSlot || 0);
            const saveStep = stepIndex;
            stepCases += `      case ${saveStep}:\n        save_game(${slot});\n        return ${saveStep + 1};\n`;
            stepIndex++;
            const trueList = (evt.true && Array.isArray(evt.true)) ? evt.true : (evt.children?.true && Array.isArray(evt.children.true) ? evt.children.true : []);
            if (trueList.length > 0) {
              processEventList(trueList, isLastEvent);
            }
            continue;
          } else if (evt.command === "EVENT_LOAD_DATA" || evt.command === "EVENT_DATA_LOAD") {
            const slot = Number(evt.args?.saveSlot || 0);
            stepCases += `      case ${stepIndex}:\n        load_game(${slot});\n        return -1;\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_CLEAR_DATA" || evt.command === "EVENT_DATA_CLEAR") {
            const slot = Number(evt.args?.saveSlot || 0);
            stepCases += `      case ${stepIndex}:\n        clear_game_data(${slot});\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_IF_SAVED_DATA" || evt.command === "EVENT_IF_DATA_SAVED") {
            const slot = Number(evt.args?.saveSlot || 0);
            const trueList = (evt.true && Array.isArray(evt.true)) ? evt.true : (evt.children?.true && Array.isArray(evt.children.true) ? evt.children.true : []);
            const falseList = (evt.false && Array.isArray(evt.false)) ? evt.false : (evt.children?.false && Array.isArray(evt.children.false) ? evt.children.false : []);

            const branchStep = stepIndex;
            stepIndex++;

            const trueStart = stepIndex;
            processEventList(trueList, isLastEvent);
            const trueEndJumpStep = stepIndex;
            stepIndex++;

            let falseStart = -1;
            if (falseList.length > 0) {
              falseStart = stepIndex;
              processEventList(falseList, isLastEvent);
            }
            const afterStep = stepIndex;

            const falseTarget = (falseList.length > 0) ? falseStart : (isLastEvent ? -1 : afterStep);
            const trueEndTarget = isLastEvent ? -1 : afterStep;

            stepCases += `      case ${branchStep}:\n        if (has_saved_data(${slot})) return ${trueStart};\n        else return ${falseTarget};\n`;
            stepCases += `      case ${trueEndJumpStep}:\n        return ${trueEndTarget};\n`;
            continue;
          } else if (evt.command === "EVENT_IF_ACTOR_DISTANCE_FROM_ACTOR") {
            const act1 = findTargetNum(evt.args?.actorId, currentActorNum);
            const act2 = findTargetNum(evt.args?.otherActorId, currentActorNum);
            const op = evt.args?.operator || "<=";
            const opMap: Record<string, number> = {
              "==": 0,
              "!=": 1,
              "<": 2,
              "<=": 3,
              ">": 4,
              ">=": 5,
            };
            const opCode = opMap[op] ?? 3;
            const distExpr = parseValueExpr(evt.args?.distance, currentActorNum, scene);
            const condExpr = `(actor_distance_check(${act1}, ${act2}, ${distExpr}, ${opCode}))`;

            const trueList = (evt.true && Array.isArray(evt.true)) ? evt.true : (evt.children?.true && Array.isArray(evt.children.true) ? evt.children.true : []);
            const falseList = (evt.false && Array.isArray(evt.false)) ? evt.false : (evt.children?.false && Array.isArray(evt.children.false) ? evt.children.false : []);

            const branchStep = stepIndex;
            stepIndex++;

            const trueStart = stepIndex;
            processEventList(trueList, isLastEvent);
            const trueEndJumpStep = stepIndex;
            stepIndex++;

            let falseStart = -1;
            if (falseList.length > 0) {
              falseStart = stepIndex;
              processEventList(falseList, isLastEvent);
            }
            const afterStep = stepIndex;

            const falseTarget = (falseList.length > 0) ? falseStart : (isLastEvent ? (isUpdateScript ? 0 : -1) : afterStep);
            const trueEndTarget = isLastEvent ? (isUpdateScript ? 0 : -1) : afterStep;

            stepCases += `      case ${branchStep}:\n        if ${condExpr} return ${trueStart};\n        else return ${falseTarget};\n`;
            stepCases += `      case ${trueEndJumpStep}:\n        return ${trueEndTarget};\n`;
            continue;
          } else if (
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
            evt.command === "EVENT_IF_ACTOR_RELATIVE_TO_ACTOR" ||
            evt.command === "EVENT_IF_COLOR_SUPPORTED" ||
            evt.command === "EVENT_IF_CURRENT_SCENE_IS" ||
            evt.command === "EVENT_IF_ENGINE_FIELD" ||
            evt.command === "EVENT_IF_ENGINE_FIELD_COMPARE"
          ) {
            stepCases += `      case ${stepIndex}:\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (evt.command === "EVENT_RATE_LIMIT") {
            let timeVal = 0.5;
            if (typeof evt.args?.time === "number") timeVal = evt.args.time;
            else if (typeof evt.args?.time === "object" && evt.args?.time?.value !== undefined) timeVal = Number(evt.args.time.value);
            else if (typeof evt.args?.frames === "number") timeVal = evt.args.frames / 60;
            else if (typeof evt.args?.frames === "object" && evt.args?.frames?.value !== undefined) timeVal = Number(evt.args.frames.value) / 60;
            const cooldownFrames = Math.max(1, Math.round(timeVal * 60));

            const trueList = (evt.true && Array.isArray(evt.true))
              ? evt.true
              : (evt.children?.true && Array.isArray(evt.children.true))
                ? evt.children.true
                : [];

            const branchStep = stepIndex;
            stepIndex++;

            const trueStart = stepIndex;
            processEventList(trueList, isLastEvent);
            const afterStep = stepIndex;

            stepCases += `      case ${branchStep}:\n        if (g_proj_rate_timer > 0) return -1;\n        g_proj_rate_timer = ${cooldownFrames};\n        return ${trueStart};\n`;
            continue;
          } else if (evt.command === "EVENT_LAUNCH_PROJECTILE" || evt.command === "EVENT_LAUNCH_PROJECTILE_SLOT") {
            const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
            const dirVal = (typeof evt.args?.direction === "object" && evt.args?.direction !== null && evt.args?.direction?.value !== undefined)
              ? evt.args.direction.value
              : (evt.args?.direction || "right");
            const dirStr = String(dirVal).toLowerCase();
            const speed = Math.max(1, Math.min(8, Number(evt.args?.speed) || 2));
            let vx = speed;
            let vy = 0;
            let offX = 12;
            let offY = 4;

            if (dirStr === "left") {
              vx = -speed;
              vy = 0;
              offX = -8;
              offY = 4;
            } else if (dirStr === "up") {
              vx = 0;
              vy = -speed;
              offX = 4;
              offY = -8;
            } else if (dirStr === "down") {
              vx = 0;
              vy = speed;
              offX = 4;
              offY = 16;
            } else if (dirStr === "up_right" || dirStr === "diagonal_up_right") {
              vx = speed;
              vy = -speed;
              offX = 12;
              offY = -4;
            } else if (dirStr === "up_left" || dirStr === "diagonal_up_left") {
              vx = -speed;
              vy = -speed;
              offX = -8;
              offY = -4;
            } else if (dirStr === "down_right" || dirStr === "diagonal_down_right") {
              vx = speed;
              vy = speed;
              offX = 12;
              offY = 12;
            } else if (dirStr === "down_left" || dirStr === "diagonal_down_left") {
              vx = -speed;
              vy = speed;
              offX = -8;
              offY = 12;
            }

            let lifeSec = 1.0;
            if (typeof evt.args?.lifeTime === "number") lifeSec = evt.args.lifeTime;
            else if (typeof evt.args?.lifeTime === "object" && evt.args?.lifeTime?.value !== undefined) lifeSec = Number(evt.args.lifeTime.value);
            const lifeFrames = Math.max(5, Math.round(lifeSec * 60));

            stepCases += `      case ${stepIndex}:\n        projectile_launch(g_actor_x[${targetNum}] + (${offX}), g_actor_y[${targetNum}] + (${offY}), ${vx}, ${vy}, ${lifeFrames}, ${targetNum}, PROJ_VRAM_ADDR, PROJ_PALETTE, SZ_16x16);\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (
            evt.command === "EVENT_ACTOR_SET_STATE" ||
            evt.command === "EVENT_ACTOR_SET_ANIMATION_STATE" ||
            evt.command === "EVENT_ACTOR_STATE_SET"
          ) {
            const targetNum = findTargetNum(evt.args?.actorId, currentActorNum);
            const stateName = String(evt.args?.spriteStateId || "").trim();
            if (stateName && stateName.toLowerCase() !== "default") {
              stepCases += `      case ${stepIndex}:\n        player_set_state(${targetNum}, 1);\n        return ${stepIndex + 1};\n`;
            } else {
              stepCases += `      case ${stepIndex}:\n        player_set_state(${targetNum}, 0);\n        return ${stepIndex + 1};\n`;
            }
            stepIndex++;
          } else if (
            evt.command === "EVENT_REMOVE_INPUT_SCRIPT" ||
            evt.command === "EVENT_INPUT_SCRIPT_REMOVE" ||
            evt.command === "EVENT_DETACH_SCRIPT"
          ) {
            const mask = parseInputButtonMask(evt.args?.input);
            const maskHex = `0x${mask.toString(16).toUpperCase().padStart(2, "0")}`;
            stepCases += `      case ${stepIndex}:\n        g_input_script_disabled_mask |= ${maskHex};\n        return ${stepIndex + 1};\n`;
            stepIndex++;
          } else if (
            evt.command === "EVENT_ACTOR_EFFECTS" ||
            evt.command === "EVENT_ACTOR_MOVE_CANCEL" ||
            evt.command === "EVENT_ACTOR_GET_DIRECTION" ||
            evt.command === "EVENT_ACTOR_GET_POSITION" ||
            evt.command === "EVENT_ACTOR_SET_ANIMATE" ||
            evt.command === "EVENT_ACTOR_SET_SPRITE" ||
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
            Object.values(evt.children).forEach((cEvts: any) => processEventList(cEvts, isLastEvent));
          }
          if (evt.true && Array.isArray(evt.true) && evt.command !== "EVENT_SET_INPUT_SCRIPT" && evt.command !== "EVENT_INPUT_SCRIPT_SET") {
            processEventList(evt.true, isLastEvent);
          }
          if (evt.false && Array.isArray(evt.false)) processEventList(evt.false, isLastEvent);
        }
      };

      processEventList(evts, true);
      return { stepCount: stepIndex, casesCode: stepCases };
    };

    // 1. Startup script: compiled into isolated run_scene_X_startup_step
    const startupResult = compileEventSequence(events, true, 0);
    const hasStartup = startupResult.stepCount > 0;
    let sceneStartupStepHelper = "";
    if (hasStartup) {
      startupResult.casesCode += `      case ${startupResult.stepCount}:\n        return -1;\n`;
      sceneStartupStepHelper = `int run_scene_${scNum}_startup_step(int step) {\n  switch (step) {\n${startupResult.casesCode}    default:\n      return -1;\n  }\n}\n\n`;
    } else {
      sceneStartupStepHelper = `int run_scene_${scNum}_startup_step(int step) {\n  return -1;\n}\n\n`;
    }

    // 2. Input scripts: each compiled into isolated run_scene_X_input_Z_step
    const sceneInputEvents = [
      ...findInputScriptEvents(scene.script),
      ...findInputScriptEvents(scene.startScript),
      ...(scene.actors || []).flatMap((act: any) => [
        ...findInputScriptEvents(act.script),
        ...findInputScriptEvents(act.startScript)
      ]),
      ...scTriggers.flatMap(({ trigger: scTrig }) => [
        ...findInputScriptEvents(scTrig.script),
        ...findInputScriptEvents(scTrig.leaveScript)
      ])
    ];

    const inputStepHelpers: string[] = [];
    const inputDispatchCases: string[] = [];
    let inputChecks = "";
    let inpIdx = 0;

    for (const inputEvt of sceneInputEvents) {
      const mask = parseInputButtonMask(inputEvt.args?.input);
      const childEvents = (inputEvt.true && Array.isArray(inputEvt.true))
        ? inputEvt.true
        : (inputEvt.children?.true && Array.isArray(inputEvt.children.true))
          ? inputEvt.children.true
          : (inputEvt.children?.press && Array.isArray(inputEvt.children.press))
            ? inputEvt.children.press
            : [];

      const currentInpIdx = inpIdx++;
      const inpResult = compileEventSequence(childEvents, false, 0);
      if (inpResult.stepCount > 0) {
        inpResult.casesCode += `      case ${inpResult.stepCount}:\n        return -1;\n`;
        inputStepHelpers.push(`int run_scene_${scNum}_input_${currentInpIdx}_step(int step) {\n  switch (step) {\n${inpResult.casesCode}    default:\n      return -1;\n  }\n}\n\n`);
        inputDispatchCases.push(`    case ${currentInpIdx}:\n      return run_scene_${scNum}_input_${currentInpIdx}_step(step);\n`);

        const maskHex = `0x${mask.toString(16).toUpperCase().padStart(2, "0")}`;
        inputChecks += `  if (pressed & ${maskHex}) {\n    g_script_scene = ${scNum};\n    g_script_type = 3;\n    g_script_target = ${currentInpIdx};\n    g_script_step = 0;\n    g_script_step = run_scene_step(${scNum}, 0);\n    return 1;\n  }\n`;
      }
    }

    if (inputChecks) {
      sceneInputCheckHelpers += `int check_scene_${scNum}_input(unsigned int pressed) {\n${inputChecks}  return 0;\n}\n\n`;
      sceneInputCheckCases += `  if (scene_num == ${scNum}) return check_scene_${scNum}_input(pressed);\n`;
    }

    // 3. Actors: each compiled into isolated run_scene_X_actor_Y_step
    const actorStepHelpers: string[] = [];
    const actorDispatchCases: string[] = [];
    const actorInteractCases: string[] = [];
    const actorUpdateStepHelpers: string[] = [];
    const actorUpdateCases: string[] = [];

    (scene.actors || []).forEach((scActor: any, aIdx: number) => {
      const actorNum = aIdx + 1;
      if (scActor.script && Array.isArray(scActor.script) && scActor.script.length > 0) {
        const actorResult = compileEventSequence(scActor.script, false, actorNum);
        if (actorResult.stepCount > 0) {
          actorResult.casesCode += `      case ${actorResult.stepCount}:\n        return -1;\n`;
          actorStepHelpers.push(`int run_scene_${scNum}_actor_${actorNum}_step(int step) {\n  switch (step) {\n${actorResult.casesCode}    default:\n      return -1;\n  }\n}\n\n`);
          actorDispatchCases.push(`    case ${actorNum}:\n      return run_scene_${scNum}_actor_${actorNum}_step(step);\n`);
          actorInteractCases.push(`    case ${actorNum}:\n      g_script_scene = ${scNum};\n      g_script_type = 1;\n      g_script_target = ${actorNum};\n      g_script_step = 0;\n      g_script_step = run_scene_step(${scNum}, 0);\n      return 1;\n`);
        } else {
          const actText = extractActorText(scActor);
          if (actText) {
            const cleanText = formatDialogueTextForC(actText);
            actorStepHelpers.push(`int run_scene_${scNum}_actor_${actorNum}_step(int step) {\n  switch (step) {\n      case 0:\n        show_dialogue("${cleanText}");\n        return -1;\n    default:\n      return -1;\n  }\n}\n\n`);
            actorDispatchCases.push(`    case ${actorNum}:\n      return run_scene_${scNum}_actor_${actorNum}_step(step);\n`);
            actorInteractCases.push(`    case ${actorNum}:\n      g_script_scene = ${scNum};\n      g_script_type = 1;\n      g_script_target = ${actorNum};\n      g_script_step = 0;\n      g_script_step = run_scene_step(${scNum}, 0);\n      return 1;\n`);
          }
        }
      } else {
        const actText = extractActorText(scActor);
        if (actText) {
          const cleanText = formatDialogueTextForC(actText);
          actorStepHelpers.push(`int run_scene_${scNum}_actor_${actorNum}_step(int step) {\n  switch (step) {\n      case 0:\n        show_dialogue("${cleanText}");\n        return -1;\n    default:\n      return -1;\n  }\n}\n\n`);
          actorDispatchCases.push(`    case ${actorNum}:\n      return run_scene_${scNum}_actor_${actorNum}_step(step);\n`);
          actorInteractCases.push(`    case ${actorNum}:\n      g_script_scene = ${scNum};\n      g_script_type = 1;\n      g_script_target = ${actorNum};\n      g_script_step = 0;\n      g_script_step = run_scene_step(${scNum}, 0);\n      return 1;\n`);
        }
      }

      if (scActor.updateScript && Array.isArray(scActor.updateScript) && scActor.updateScript.length > 0) {
        const updateResult = compileEventSequence(scActor.updateScript, false, actorNum, true);
        if (updateResult.stepCount > 0) {
          updateResult.casesCode += `      case ${updateResult.stepCount}:\n        return 0;\n`;
          actorUpdateStepHelpers.push(`int run_scene_${scNum}_actor_${actorNum}_update_step(int step) {\n  switch (step) {\n${updateResult.casesCode}    default:\n      return 0;\n  }\n}\n\n`);
          actorUpdateCases.push(`    case ${actorNum}:\n      if (g_actor_wait_timer[${actorNum}] > 0) {\n        g_actor_wait_timer[${actorNum}]--;\n      } else {\n        g_actor_update_step[${actorNum}] = run_scene_${scNum}_actor_${actorNum}_update_step(g_actor_update_step[${actorNum}]);\n      }\n      break;\n`);
        }
      }
    });

    if (actorInteractCases.length > 0) {
      sceneActorInteractHelpers += `int interact_scene_${scNum}_actor(int actor_num) {\n  switch (actor_num) {\n${actorInteractCases.join("")}    default:\n      return 0;\n  }\n}\n\n`;
      sceneActorInteractCases += `  if (scene_num == ${scNum}) return interact_scene_${scNum}_actor(actor_num);\n`;
    }

    if (actorUpdateCases.length > 0) {
      sceneActorUpdateHelpers += `${actorUpdateStepHelpers.join("")}void update_scene_${scNum}_actors(void) {\n  int a;\n  for (a = 1; a < g_actor_count; a++) {\n    if (!g_actor_active[a] || g_actor_hidden[a]) continue;\n    switch (a) {\n${actorUpdateCases.join("")}      default:\n        break;\n    }\n  }\n}\n\n`;
      sceneActorUpdateCases += `  if (scene_num == ${scNum}) { update_scene_${scNum}_actors(); return; }\n`;
    }

    // 4. Triggers: each compiled into isolated run_scene_X_trigger_Y_step
    const triggerStepHelpers: string[] = [];
    const triggerDispatchCases: string[] = [];
    const triggerInteractCases: string[] = [];

    scTriggers.forEach(({ globalIdx, trigger: scTrigger }) => {
      if (scTrigger.script && Array.isArray(scTrigger.script) && scTrigger.script.length > 0) {
        const trigResult = compileEventSequence(scTrigger.script, false, 0);
        if (trigResult.stepCount > 0) {
          trigResult.casesCode += `      case ${trigResult.stepCount}:\n        return -1;\n`;
          triggerStepHelpers.push(`int run_scene_${scNum}_trigger_${globalIdx}_step(int step) {\n  switch (step) {\n${trigResult.casesCode}    default:\n      return -1;\n  }\n}\n\n`);
          triggerDispatchCases.push(`    case ${globalIdx}:\n      return run_scene_${scNum}_trigger_${globalIdx}_step(step);\n`);
          triggerInteractCases.push(`    case ${globalIdx}:\n      g_script_scene = ${scNum};\n      g_script_type = 2;\n      g_script_target = ${globalIdx};\n      g_script_step = 0;\n      g_script_step = run_scene_step(${scNum}, 0);\n      return (g_script_step >= 0 || g_script_scene != ${scNum}) ? 1 : 0;\n`);
        }
      }
    });

    if (triggerInteractCases.length > 0) {
      sceneTriggerInteractHelpers += `int interact_scene_${scNum}_trigger(int trigger_num) {\n  switch (trigger_num) {\n${triggerInteractCases.join("")}    default:\n      return 0;\n  }\n}\n\n`;
      sceneTriggerInteractCases += `  if (scene_num == ${scNum}) return interact_scene_${scNum}_trigger(trigger_num);\n`;
    }

    sceneStartupCases += `  if (scene_num == ${scNum}) return ${hasStartup ? 1 : 0};\n`;

    // 5. Scene step dispatcher: isolated dispatcher per scene
    let sceneStepBody = "";
    sceneStepBody += `  if (g_script_type == 0) {\n    return run_scene_${scNum}_startup_step(step);\n  }\n`;

    if (actorDispatchCases.length > 0) {
      sceneStepBody += `  if (g_script_type == 1) {\n    switch (g_script_target) {\n${actorDispatchCases.join("")}      default:\n        return -1;\n    }\n  }\n`;
    }
    if (triggerDispatchCases.length > 0) {
      sceneStepBody += `  if (g_script_type == 2) {\n    switch (g_script_target) {\n${triggerDispatchCases.join("")}      default:\n        return -1;\n    }\n  }\n`;
    }
    if (inputDispatchCases.length > 0) {
      sceneStepBody += `  if (g_script_type == 3) {\n    switch (g_script_target) {\n${inputDispatchCases.join("")}      default:\n        return -1;\n    }\n  }\n`;
    }
    sceneStepBody += `  return -1;\n`;

    const sceneStepFunction = `int run_scene_${scNum}_step(int step) {\n${sceneStepBody}}\n\n`;

    sceneStepHelpers += sceneStartupStepHelper;
    if (actorStepHelpers.length > 0) sceneStepHelpers += actorStepHelpers.join("");
    if (triggerStepHelpers.length > 0) sceneStepHelpers += triggerStepHelpers.join("");
    if (inputStepHelpers.length > 0) sceneStepHelpers += inputStepHelpers.join("");
    sceneStepHelpers += sceneStepFunction;

    sceneInitCases += `  if (scene_num == ${scNum}) res_step = run_scene_${scNum}_step(step);\n`;
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
    let parallaxCode = "      camera_reset_parallax();\n";
    if (scene.parallax && Array.isArray(scene.parallax) && scene.parallax.length > 0) {
      const pLayers: any[] = scene.parallax;
      const numLayers = Math.min(4, pLayers.length);
      let currentTop = 0;
      let layerLines = `      camera_set_parallax_count(${numLayers});\n`;
      for (let i = 0; i < numLayers; i++) {
        const layer = pLayers[i];
        const hTiles = (typeof layer.height === "number" && layer.height > 0) ? layer.height : 1;
        const spd = typeof layer.speed === "number" ? layer.speed : 0;
        let topScanline = currentTop;
        let bottomScanline = 223;
        if (i < numLayers - 1) {
          bottomScanline = Math.min(222, currentTop + hTiles * 8 - 1);
          currentTop = bottomScanline + 1;
        }
        layerLines += `      camera_set_parallax_layer(${i}, ${topScanline}, ${bottomScanline}, ${spd});\n`;
      }
      parallaxCode = layerLines;
    }
    const bgFile = sceneBgFilenames[idx];
    const key = `${bgFile}|${dim.width}|${dim.height}`;
    const symPrefix = bgSymbolMap.get(key) || `bg_file_0`;
    sceneBackgroundCases += `    case ${scNum}:\n      g_current_scene_type = SCENE_${scNum}_TYPE;\n      g_collision_width = SCENE_${scNum}_WIDTH;\n      g_collision_height = SCENE_${scNum}_HEIGHT;\n      set_screen_size(SCENE_${scNum}_SCR_SIZE);\n      camera_set_bounds(SCENE_${scNum}_WIDTH, SCENE_${scNum}_HEIGHT);\n${parallaxCode}      load_background(${symPrefix}_chr, ${symPrefix}_pal, ${symPrefix}_bat, ${dim.width}, ${dim.height});\n      set_map_data(scene_${scNum}_collisions, ${dim.width}, ${dim.height});\n      break;\n`;
  });

  // Build one helper per scene for actor loading, then a tiny dispatcher.
  // This prevents load_scene_actors from exceeding the 8192-byte .PROC limit
  // as the project grows with more scenes and actors.
  let sceneActorHelpers = "";
  let sceneActorCases = "";
  allScenes.forEach((scene: any, idx: number) => {
    const scNum = idx + 1;
    const sceneActors = scene.actors || [];
    const helperName = `load_scene_actors_${scNum}`;

    let helperCode = `void ${helperName}() {\n`;
    helperCode += `  g_actor_count = ${1 + sceneActors.length};\n`;
    helperCode += `  #ifdef ACTOR_SCENE_${scNum}_PLAYER_HIDDEN\n`;
    helperCode += `  actor_hide(0);\n`;
    helperCode += `  #endif\n`;
    helperCode += `  #ifdef HAS_PROJECTILES\n`;
    helperCode += `  load_vram(0x7000, proj_spr_default, 0x40);\n`;
    helperCode += `  load_palette(31, proj_pal_default, 1);\n`;
    helperCode += `  #endif\n`;

    let currentVram = 0x5800;
    sceneActors.forEach((scActor: any, aIdx: number) => {
      const actorNum = aIdx + 1;
      const palIdx = 1 + (aIdx % 15);
      const vramHex = `0x${currentVram.toString(16).toUpperCase()}`;

      const dir = scActor?.direction?.toLowerCase() || "down";
      let dirSlot = 3;
      if (dir === "right") dirSlot = 0;
      else if (dir === "left") dirSlot = 1;
      else if (dir === "up") dirSlot = 2;

      let sprObj: any = null;
      if (scActor.spriteSheetId && allSprites.length > 0) {
        sprObj = allSprites.find((s: any) => s.id === scActor.spriteSheetId);
      }
      let actorAnimFrames: any[] = [];
      if (sprObj?.states?.[0]) {
        const animType = sprObj.states[0].animationType || "fixed";
        const flipLeft = sprObj.states[0].flipLeft ?? true;
        const rawAnims = sprObj.states[0].animations || [];
        const mapped = animationMapBySpriteType(
          rawAnims,
          animType,
          flipLeft,
          (anim, flip) => ({ anim, flip })
        );

        const chosenMapped = mapped[dirSlot] || mapped[0];
        if (chosenMapped?.anim && Array.isArray(chosenMapped.anim.frames)) {
          actorAnimFrames = chosenMapped.anim.frames;
        }
      }
      const canvasW = sprObj?.canvasWidth || 16;
      const canvasH = sprObj?.canvasHeight || 16;
      const totalW16 = Math.max(1, Math.min(4, Math.ceil(canvasW / 16)));
      let origH16 = Math.max(1, Math.min(4, Math.ceil(canvasH / 16)));
      if (origH16 === 3) origH16 = 4;
      const isMultiPart = totalW16 > 2;
      const origW16 = isMultiPart ? 2 : totalW16;

      let vramSizeHex = "0x40";
      if (origW16 === 1 && origH16 === 2) vramSizeHex = "0x100";
      else if (origW16 === 2 && origH16 === 1) vramSizeHex = "0x80";
      else if (origW16 === 2 && origH16 === 2) vramSizeHex = "0x100";
      else if (origW16 === 2 && origH16 === 4) vramSizeHex = "0x200";
      else if (origW16 === 1 && origH16 === 4) vramSizeHex = "0x200";

      let maxAllowedFrames = 4;
      if (vramSizeHex === "0x40") maxAllowedFrames = 8;
      else if (vramSizeHex === "0x80" || vramSizeHex === "0x100") maxAllowedFrames = 4;
      else if (vramSizeHex === "0x200") maxAllowedFrames = 4;

      const numFrames = Math.max(1, Math.min(maxAllowedFrames, actorAnimFrames.length > 0 ? actorAnimFrames.length : 1));

      helperCode += `  #ifdef HAS_ACTOR_SCENE_${scNum}_${actorNum}\n`;
      if (isMultiPart) {
        for (let f = 0; f < numFrames; f++) {
          const off0 = f === 0 ? "" : ` + ${f * 2} * ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE`;
          const off1 = ` + ${f * 2 + 1} * ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE`;
          helperCode += `  load_vram(${vramHex}${off0}, actor_sc${scNum}_${actorNum}_f${f}_p0_spr, ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE);\n`;
          helperCode += `  load_vram(${vramHex}${off1}, actor_sc${scNum}_${actorNum}_f${f}_p1_spr, ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE);\n`;
        }
        helperCode += `  g_actor_parts[${actorNum}] = 2;\n`;
      } else {
        for (let f = 0; f < numFrames; f++) {
          const off = f === 0 ? "" : ` + ${f} * ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE`;
          helperCode += `  load_vram(${vramHex}${off}, actor_sc${scNum}_${actorNum}_f${f}_spr, ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE);\n`;
        }
        helperCode += `  g_actor_parts[${actorNum}] = 1;\n`;
      }
      helperCode += `  load_palette(${16 + palIdx}, actor_sc${scNum}_${actorNum}_pal, 1);\n`;
      helperCode += `  g_actor_active[${actorNum}] = 1;\n`;
      helperCode += `  g_actor_tile_id[${actorNum}] = ${vramHex};\n`;
      helperCode += `  g_actor_base_tile_id[${actorNum}] = ${vramHex};\n`;
      helperCode += `  g_actor_frame_vram_size[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_VRAM_SIZE;\n`;
      helperCode += `  g_actor_num_frames[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_NUM_FRAMES;\n`;
      helperCode += `  g_actor_anim_speed[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_ANIM_SPEED;\n`;
      helperCode += `  g_actor_anim_frame[${actorNum}] = 0;\n`;
      helperCode += `  g_actor_anim_timer[${actorNum}] = 0;\n`;
      helperCode += `  g_actor_palette[${actorNum}] = ${palIdx};\n`;
      helperCode += `  g_actor_size[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_SPRITE_SIZE;\n  g_actor_bbox_left[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_BBOX_LEFT;\n  g_actor_bbox_right[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_BBOX_RIGHT;\n  g_actor_bbox_top[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_BBOX_TOP;\n  g_actor_bbox_bottom[${actorNum}] = ACTOR_SCENE_${scNum}_${actorNum}_BBOX_BOTTOM;\n  actor_set_pos(${actorNum}, ACTOR_SCENE_${scNum}_${actorNum}_X, ACTOR_SCENE_${scNum}_${actorNum}_Y);\n  actor_set_dir(${actorNum}, ${dirSlot});\n`;
      helperCode += `  #ifdef ACTOR_SCENE_${scNum}_${actorNum}_HIDDEN\n`;
      helperCode += `  actor_hide(${actorNum});\n`;
      helperCode += `  #endif\n`;
      helperCode += `  #endif\n`;

      const vramInc = isMultiPart ? (numFrames * 2 * parseInt(vramSizeHex, 16)) : Math.max(0x200, numFrames * parseInt(vramSizeHex, 16));
      currentVram += vramInc;
    });

    helperCode += `}\n\n`;
    sceneActorHelpers += helperCode;

    // Dispatcher: just one call per scene
    sceneActorCases += `    case ${scNum}:\n      ${helperName}();\n      break;\n`;
  });

  const sceneInitFunctionC = `#define HAS_SCENE_STEP_EVENTS 1
#define HAS_SCENE_INPUT_SCRIPTS 1
#define HAS_SCENE_STARTUP_SCRIPTS 1
#define HAS_INTERACT_ACTOR 1
#define HAS_INTERACT_TRIGGER 1
#define HAS_ACTOR_UPDATE_SCRIPTS 1
#define HAS_SCENE_BACKGROUND 1
#define HAS_SCENE_MUSIC 1
#define HAS_SCENE_PLAYER_SPRITE 1
#define HAS_SCENE_ACTORS 1

#ifndef SCRIPT_TYPE_STARTUP
#define SCRIPT_TYPE_STARTUP 0
#define SCRIPT_TYPE_ACTOR 1
#define SCRIPT_TYPE_TRIGGER 2
#define SCRIPT_TYPE_INPUT 3
#endif

int run_scene_step(int scene_num, int step);

${sceneStepHelpers}
${sceneInputCheckHelpers}
${sceneActorInteractHelpers}
${sceneTriggerInteractHelpers}
${sceneActorUpdateHelpers}
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
  if (g_inside_trigger || g_script_step >= 0) return 0;
  pressed &= ~g_input_script_disabled_mask;
  if (!pressed) return 0;
${sceneInputCheckCases}  return 0;
}

int scene_has_startup_script(int scene_num) {
${sceneStartupCases}  return 0;
}

int interact_actor(int scene_num, int actor_num) {
${sceneActorInteractCases}  return 0;
}

int interact_trigger(int scene_num, int trigger_num) {
${sceneTriggerInteractCases}  return 0;
}

void update_scene_actors(int scene_num) {
${sceneActorUpdateCases}}

void load_scene_music(int scene_num) {
  switch (scene_num) {
${sceneMusicCases}    default:
      pce_sound_stop();
      break;
  }
}

${playerSpriteHelpers}void load_scene_player_sprite(int scene_num) {
  switch (scene_num) {
${scenePlayerSpriteCases}    default:
      break;
  }
}

void load_scene_player_sprite_state(int scene_num, int state, int dir) {
  switch (scene_num) {
${scenePlayerSpriteStateCases}    default:
      break;
  }
}

void player_set_state(int actor_num, int state) {
  if (actor_num == 0) {
    if (state > 0) {
      g_actor_state[0] = state;
      g_player_anim_timer = 0;
      g_player_anim_frame = 0;
      load_scene_player_sprite_state(g_current_scene, state, g_actor_dir[0]);
      g_actor_tile_id[0] = 0x5000;
    } else {
      g_actor_state[0] = 0;
      g_actor_num_frames[0] = 2;
      g_player_anim_timer = 0;
      g_player_anim_frame = 0;
      load_scene_player_sprite(g_current_scene);
      update_player_anim(0);
    }
  } else if (actor_num > 0 && actor_num < g_actor_count) {
    g_actor_state[actor_num] = state;
  }
}

void load_scene_background(int scene_num) {
  switch (scene_num) {
${sceneBackgroundCases}    default:
      break;
  }
}

${sceneActorHelpers}void load_scene_actors(int scene_num) {
  switch (scene_num) {
${sceneActorCases}    default:
      g_actor_count = 1;
      break;
  }
}
`;

  const startSceneObj = (startSceneNum > 0 && startSceneNum <= allScenes.length) ? allScenes[startSceneNum - 1] : allScenes[0];
  let startSheetId = startSceneObj?.playerSpriteSheetId;
  if (!startSheetId && defSpritesMap && typeof defSpritesMap === "object" && startSceneObj?.type && defSpritesMap[startSceneObj.type]) {
    startSheetId = defSpritesMap[startSceneObj.type];
  }
  if (!startSheetId && (startSceneObj?.type === "TOPDOWN" || startSceneObj?.type === "ADVENTURE") && defaultTopdownSpr) {
    startSheetId = defaultTopdownSpr.id;
  }
  startSheetId = startSheetId || defaultPlayerSpriteSheetId;
  const startSceneCompiled = compiledPlayerSprites.get(String(startSheetId)) || firstCompiled;

  let playerSprVramSizeHex = startSceneCompiled?.vramSizeHex || "0x40";
  let playerSprSizeConst = startSceneCompiled?.sizeConst || "SZ_16x16";

  const mainCContent = `
#include <huc.h>

/* Scene type: must be defined BEFORE including engine.h */
${sceneTypeDefine}
#include "include/engine.h"

${bgDirectives}

${uiFrameDirectives}

${playerDirectives}
#define HAS_PLAYER_4DIR 1
#define HAS_PLAYER_FRAME_1 1

${actorDirectives}
${projDirectives}

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
#asm
 .code
#endasm
#include "src/actor.c"
#include "src/camera.c"
#include "src/collision.c"
#include "src/trigger.c"
#include "src/vm.c"
#include "src/projectile.c"

${sceneInitFunctionC}

#include "src/engine.c"

void pce_init_music_ptrs(void) {
#asm
${initMusicAsm}
#endasm
}

main() {
    pce_init_music_ptrs();
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

  const progress = (typeof outputBuildDir === "object" && outputBuildDir?.progress) ? outputBuildDir.progress : (() => { });
  const warnings = (typeof outputBuildDir === "object" && outputBuildDir?.warnings) ? outputBuildDir.warnings : (() => { });

  if (typeof makeBuildFn === "function") {
    try {
      await makeBuildFn({
        buildRoot: buildDir,
        romFilename,
        progress,
        warnings,
      });
    } catch (e: any) {
      if (warnings) {
        warnings(e.message || String(e));
      }
      console.error("Error executing makeBuild in buildProject:", e);
      throw e;
    }
  }

  return { mainCPath };
}

export default buildProject;
