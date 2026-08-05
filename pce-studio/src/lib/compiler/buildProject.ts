import fs from "fs-extra";
import Path from "path";
import compileData from "./compileData";
import ejectBuild from "./ejectBuild";
import makeBuild from "./makeBuild";
import { loadEngineSchema } from "lib/project/loadEngineSchema";
import loadAllScriptEventHandlers from "lib/project/loadScriptEventHandlers";
import { globSync } from "lib/helpers/glob";
import { convertPngToPcx } from "./convertPngToPcx";

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

      // Only include raw root-level asset .c files compatible with Small C
      const baseName = Path.basename(filename);
      const isSubDir = filename.includes("/") || filename.includes("\\");
      if (
        filename.endsWith(".c") &&
        !isSubDir &&
        baseName !== "main.c" &&
        !baseName.startsWith("font_") &&
        !baseName.startsWith("scene_") &&
        !baseName.includes("signature") &&
        !fileContent.includes("struct ") &&
        !baseName.endsWith("_collisions.c")
      ) {
        cFileIncludes.push(`#include "${baseName}"`);
      }
    }
  }

  // Detect project background and player sprite images and update main.c top level with HuC directives
  progress("Generating HuC PC Engine graphic image assets...");
  const bgFiles = globSync("**/*.png", { cwd: Path.join(outputAssetsDir, "backgrounds"), absolute: false });
  const spritePngFiles = globSync("**/*.png", { cwd: Path.join(outputAssetsDir, "sprites"), absolute: false });

  let bgImageRelativePath = "assets/backgrounds/scene.png";
  if (bgFiles.length > 0) {
    const bgMatch = bgFiles.find(f => !f.includes("placeholder")) || bgFiles[0];
    bgImageRelativePath = `assets/backgrounds/${bgMatch.replace(/\\/g, "/")}`;
  }

  // Resolve player actor sprite filename from projectData
  let playerSpriteFilename = "";
  if (projectData) {
    const playerSpriteId =
      projectData.scenes?.[0]?.actors?.[0]?.spriteSheetId ||
      projectData.settings?.playerSpriteSheetId;

    if (playerSpriteId && projectData.sprites) {
      const foundSprite = projectData.sprites.find((s: any) => s.id === playerSpriteId);
      if (foundSprite && foundSprite.filename) {
        playerSpriteFilename = foundSprite.filename;
      }
    }
  }

  if (!playerSpriteFilename && spritePngFiles.length > 0) {
    const isoHeroMatch = spritePngFiles.find(f => f.includes("iso_hero"));
    if (isoHeroMatch) {
      playerSpriteFilename = isoHeroMatch;
    } else {
      const sprMatch = spritePngFiles.find(f => !f.includes("static")) || spritePngFiles[0];
      playerSpriteFilename = sprMatch;
    }
  }

  let spritePcxRelativePath = "assets/sprites/iso_hero.pcx";
  let sprWidth16 = 1;
  let sprHeight16 = 1;

  if (playerSpriteFilename) {
    const srcPng = Path.join(outputAssetsDir, "sprites", playerSpriteFilename);
    const destPcx = srcPng.replace(/\.png$/i, ".pcx");
    try {
      const dims = convertPngToPcx(srcPng, destPcx);
      sprWidth16 = Math.max(1, Math.min(2, Math.floor(dims.width / 16)));
      sprHeight16 = Math.max(1, Math.min(2, Math.floor(dims.height / 16)));
      spritePcxRelativePath = `assets/sprites/${Path.relative(Path.join(outputAssetsDir, "sprites"), destPcx).replace(/\\/g, "/")}`;
    } catch (e) {
      console.error("Error converting player sprite PNG to PCX:", e);
    }
  }

  const mainCPath = Path.join(outputRoot, "main.c");
  let mainCContent = `/*\n * PCE Studio Engine Main Entry Point\n * Compiled with HuC (PC Engine C Compiler)\n */\n\n#include <huc.h>\n\n#incchr(bg_scene_chr, "${bgImageRelativePath}")\n#incpal(bg_scene_pal, "${bgImageRelativePath}")\n#incbat(bg_scene_bat, "${bgImageRelativePath}", 0x1000, 32, 28)\n\n#incspr(player_spr, "${spritePcxRelativePath}", 0, 0, ${sprWidth16}, ${sprHeight16})\n#incpal(player_pal, "${spritePcxRelativePath}")\n\n#ifndef MAIN_C\n#define MAIN_C\n\n#include "include/engine.h"\n#include "src/pce_system.c"\n#include "src/actor.c"\n#include "src/camera.c"\n#include "src/collision.c"\n#include "src/trigger.c"\n#include "src/vm.c"\n#include "src/engine.c"\n#include "game_includes.h"\n\nmain() {\n    engine_run();\n}\n\n#endif\n`;
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
