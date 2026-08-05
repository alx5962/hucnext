import fs from "fs-extra";
import Path from "path";
import compileData from "./compileData";
import ejectBuild from "./ejectBuild";
import makeBuild from "./makeBuild";
import { loadEngineSchema } from "lib/project/loadEngineSchema";
import loadAllScriptEventHandlers from "lib/project/loadScriptEventHandlers";

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

  await ejectBuild({
    outputRoot,
    progress,
  });

  const compiledData = await compileData(projectData, {
    projectRoot,
    engineSchema: loadedEngineSchema,
    scriptEventHandlers,
    tmpPath: outputRoot,
    progress,
    warnings,
  });

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
