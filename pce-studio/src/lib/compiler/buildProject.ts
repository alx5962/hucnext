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
  TOPDOWN:     0,
  PLATFORM:    1,
  ADVENTURE:   2,
  SHMUP:       3,
  POINTNCLICK: 4,
  LOGO:        5,
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
  for (const bDir of [projectBgResDir, bgAssetsResDir]) {
    if (fs.existsSync(bDir)) {
      const gbsFiles = fs.readdirSync(bDir).filter((f: any) => typeof f === "string" && f.endsWith(".gbsres"));
      for (const gf of gbsFiles) {
        try {
          const json = fs.readJsonSync(pathModule.join(bDir, gf));
          if (json && json.id && json.filename) {
            bgsFromGbsres.push(json);
          }
        } catch (e) { }
      }
    }
  }

  const allBackgrounds = [...(projectData.backgrounds || []), ...bgsFromGbsres];
  const bgIdMap: Record<string, string> = {};
  allBackgrounds.forEach((bg: any) => {
    if (bg && bg.id && bg.filename) {
      bgIdMap[bg.id] = bg.filename;
    }
    if (bg && bg.id && bg.name) {
      const fn = bg.filename || (bg.name.endsWith(".png") ? bg.name : `${bg.name}.png`);
      bgIdMap[bg.id] = fn;
      bgIdMap[bg.name] = fn;
    }
  });

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
      if (scene.background && typeof scene.background === "object" && scene.background.filename) {
        return scene.background.filename;
      }
      if (scene.filename) {
        return scene.filename;
      }
    }
    const projectBgDir = pathModule.join(projDir, "assets", "backgrounds");
    if (fs.existsSync(projectBgDir)) {
      const pngFiles = fs.readdirSync(projectBgDir).filter((f: any) => typeof f === "string" && f.endsWith(".png"));
      if (pngFiles.length > 0) {
        return pngFiles[idx % pngFiles.length];
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

  const uniqueBgFiles = Array.from(new Set(sceneBgFilenames));
  for (const bgFile of uniqueBgFiles) {
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

  let bgDirectives = "";
  sceneBgFilenames.forEach((bgFile, idx) => {
    const scNum = idx + 1;
    bgDirectives += `#incchr(bg_scene${scNum}_chr, "assets/backgrounds/${bgFile}", 0, 0, 32, 28)\n`;
    bgDirectives += `#incpal(bg_scene${scNum}_pal, "assets/backgrounds/${bgFile}")\n`;
    bgDirectives += `#incbat(bg_scene${scNum}_bat, "assets/backgrounds/${bgFile}", 0x1000, 32, 28)\n`;
  });

  let collisionIncludes = "";
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

    const lines: string[] = [];
    for (let i = 0; i < colBytes.length; i += 16) {
      const chunk = Array.from(colBytes.slice(i, i + 16)).map(c => `0x${c.toString(16).padStart(2, "0").toUpperCase()}`);
      lines.push(`  ${chunk.join(", ")}`);
    }
    const cContent = `#include "include/gbs_types.h"\n\nconst unsigned char scene_${scNum}_collisions[] = {\n${lines.join(",\n")}\n};\n`;
    fs.writeFileSync(colFilePath, cContent, "utf8");

    collisionIncludes += `#define HAS_SCENE_${scNum}_COLLISIONS 1\n`;
    collisionIncludes += `#include "${colFileName}"\n`;
  });

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

  const parseCoord = (val: any, fallback: number) => {
    if (typeof val === "number" && !isNaN(val)) return Math.floor(val) * 8;
    if (typeof val === "object" && val !== null && typeof val.value === "number" && !isNaN(val.value)) return Math.floor(val.value) * 8;
    if (typeof val === "object" && val !== null && typeof val.x === "number" && !isNaN(val.x)) return Math.floor(val.x) * 8;
    if (typeof val === "string" && !isNaN(Number(val))) return Math.floor(Number(val)) * 8;
    return fallback * 8;
  };

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

  // Dynamic actors processing for all scenes
  let actorDirectives = "";
  let actorDefines = "";

  allScenes.forEach((scene: any, sceneIdx: number) => {
    const sceneNum = sceneIdx + 1;
    const sceneActors = scene.actors || [];

    sceneActors.forEach((scActor: any, aIdx: number) => {
      const actorNum = aIdx + 1;
      let sprFilename = "actor_animated.png";
      let sprObj: any = null;
      if (scActor.spriteSheetId && allSprites.length > 0) {
        sprObj = allSprites.find((s: any) => s.id === scActor.spriteSheetId);
        if (sprObj?.filename) sprFilename = String(sprObj.filename);
      }

      const srcPng = pathModule.join(outputAssetsDir, "sprites", sprFilename);
      const destPcx = srcPng.replace(/\.png$/i, `_sc${sceneNum}_${actorNum}.pcx`);
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
          w16 = Math.max(1, Math.min(2, Math.floor(canvasW / 16)));
          h16 = Math.max(1, Math.min(2, Math.floor(canvasH / 16)));
          cropX = getCropXForActor(scActor, sprObj, canvasW);
        } else {
          cropX = getCropXForActor(scActor, null, 16);
        }

        const dims = convertPngToPcx(srcPng, destPcx, { cropX, cropY, cropW, cropH });
        if (!sprObj) {
          w16 = Math.max(1, Math.min(2, Math.floor(dims.width / 16)));
          h16 = Math.max(1, Math.min(2, Math.floor(dims.height / 16)));
        }

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
        actorDefines += `#define HAS_ACTOR_SCENE_${sceneNum}_${actorNum} 1\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_X ${actX}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_Y ${actY}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_VRAM_SIZE ${vramSizeHex}\n#define ACTOR_SCENE_${sceneNum}_${actorNum}_SPRITE_SIZE ${sprSizeConst}\n${textDef}`;

        if (aIdx === 0) {
          actorDefines += `#define HAS_ACTOR_SCENE_${sceneNum} 1\n#define ACTOR_SCENE_${sceneNum}_X ${actX}\n#define ACTOR_SCENE_${sceneNum}_Y ${actY}\n#define ACTOR_SCENE_${sceneNum}_VRAM_SIZE ${vramSizeHex}\n#define ACTOR_SCENE_${sceneNum}_SPRITE_SIZE ${sprSizeConst}\n`;
        }
      } catch (e) {
        console.error(`Error processing Scene ${sceneNum} actor ${actorNum} sprite:`, e);
      }
    });
  });

  // Resolve Triggers
  const sceneIdToNum: Record<string, number> = {};
  allScenes.forEach((scene: any, idx: number) => {
    if (scene.id) {
      sceneIdToNum[scene.id] = idx + 1;
    }
  });

  let triggerDefines = "";
  let triggerIndex = 1;

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

      triggerDefines += `#define HAS_TRIGGER_${triggerIndex} 1\n`;
      triggerDefines += `#define TRIGGER_${triggerIndex}_SCENE ${sceneNum}\n`;
      triggerDefines += `#define TRIGGER_${triggerIndex}_X ${tx}\n`;
      triggerDefines += `#define TRIGGER_${triggerIndex}_Y ${ty}\n`;
      triggerDefines += `#define TRIGGER_${triggerIndex}_W ${tw}\n`;
      triggerDefines += `#define TRIGGER_${triggerIndex}_H ${th}\n`;
      triggerDefines += `#define TRIGGER_${triggerIndex}_TARGET_SCENE ${targetScene}\n`;
      triggerDefines += `#define TRIGGER_${triggerIndex}_TARGET_X ${targetX}\n`;
      triggerDefines += `#define TRIGGER_${triggerIndex}_TARGET_Y ${targetY}\n`;
      triggerIndex++;
    });
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

/* Scene type: must be defined BEFORE including engine.h */
${sceneTypeDefine}
#include "include/engine.h"

#incspr(player_spr, "${playerPcxRelativePath}", 0, 0, ${playerSprWidth16}, ${playerSprHeight16})
#incpal(player_pal, "${playerPcxRelativePath}")

${bgDirectives}

${actorDirectives}

#define PLAYER_START_X ${playerStartX}
#define PLAYER_START_Y ${playerStartY}
${hasMusicDef}

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
#include "src/engine.c"

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
