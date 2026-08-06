import fs from "fs-extra";
import Path from "path";
import { defaultEngineRoot } from "consts";

export type EjectOptions = {
  projectRoot?: string;
  tmpPath?: string;
  projectData?: any;
  engineSchema?: any;
  outputRoot: string;
  compiledData?: any;
  buildType?: string;
  progress?: (msg: string) => void;
  warnings?: (msg: string) => void;
};

export const ejectBuild = async ({
  outputRoot,
  compiledData,
  progress = () => {},
}: EjectOptions) => {
  progress("Ejecting PC Engine engine sources and data...");

  await fs.ensureDir(outputRoot);

  // Copy pcevm engine files into outputRoot
  await fs.copy(defaultEngineRoot, outputRoot, {
    overwrite: true,
  });

  if (compiledData && compiledData.files) {
    for (const [filename, content] of Object.entries(compiledData.files)) {
      const fullPath = Path.join(outputRoot, filename);
      await fs.ensureDir(Path.dirname(fullPath));
      await fs.writeFile(fullPath, content as string, "utf8");
    }
  }

  progress("Engine source files ejected successfully.");
};

export default ejectBuild;
