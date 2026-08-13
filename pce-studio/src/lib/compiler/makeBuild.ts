import fs from "fs-extra";
import Path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { hucBinRoot, hucIncludeRoot } from "consts";

const execAsync = promisify(exec);

export type MakeOptions = {
  buildRoot: string;
  romFilename: string;
  tmpPath: string;
  data?: any;
  buildType?: string;
  debug?: boolean;
  progress?: (msg: string) => void;
  warnings?: (msg: string) => void;
};

export const cancelBuildCommandsInProgress = () => {};

export const makeBuild = async ({
  buildRoot,
  romFilename,
  progress = () => {},
  warnings = () => {},
}: MakeOptions) => {
  progress("Preparing PC Engine compilation with HuC toolchain...");

  const hucExe = Path.join(hucBinRoot, "huc.exe");
  const pceasExe = Path.join(hucBinRoot, "pceas.exe");

  if (!fs.existsSync(hucExe) || !fs.existsSync(pceasExe)) {
    throw new Error(`HuC toolchain missing at ${hucBinRoot}`);
  }

  // Copy HuC system headers into buildRoot/include/huc for guaranteed local resolution
  const localIncludeHuc = Path.join(buildRoot, "include", "huc");
  await fs.copy(hucIncludeRoot, localIncludeHuc, { overwrite: true });

  const env = {
    ...process.env,
    PCE_INCLUDE: "include/huc",
    PCE_PCEAS: pceasExe,
  };

  const mainC = Path.join(buildRoot, "main.c");
  if (!fs.existsSync(mainC)) {
    throw new Error(`Main source file missing at ${mainC}`);
  }

  progress("Running HuC compiler (C -> 6502 Assembly -> .PCE ROM)...");

  const cmd = `"${hucExe}" main.c`;
  const { stdout, stderr } = await execAsync(cmd, {
    cwd: buildRoot,
    env,
  });

  if (stderr && stderr.trim().length > 0) {
    warnings(stderr);
  }

  progress(`HuC compilation output:\n${stdout}`);

  // Create target rom directory (build/rom)
  const romDir = Path.basename(buildRoot) === "build"
    ? Path.join(buildRoot, "rom")
    : Path.join(buildRoot, "build", "rom");
  await fs.ensureDir(romDir);

  const defaultOutputPce = Path.join(buildRoot, "main.pce");
  const targetOutputPce = Path.join(romDir, romFilename || "game.pce");

  if (fs.existsSync(defaultOutputPce)) {
    await fs.move(defaultOutputPce, targetOutputPce, { overwrite: true });
  }

  progress(`Successfully generated ROM at ${targetOutputPce}`);
  return targetOutputPce;
};

export default makeBuild;
