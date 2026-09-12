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

export const cancelBuildCommandsInProgress = () => { };

export const makeBuild = async ({
  buildRoot,
  romFilename,
  data,
  progress = () => { },
  warnings = () => { },
}: MakeOptions) => {
  progress("Preparing PC Engine compilation with HuC toolchain...");

  const hucExe = Path.join(hucBinRoot, "huc.exe");
  const pceasExe = Path.join(hucBinRoot, "pceas.exe");

  if (!fs.existsSync(hucExe) || !fs.existsSync(pceasExe)) {
    throw new Error(`HuC toolchain missing at ${hucBinRoot}`);
  }

  // Ensure engine files and headers are present in buildRoot (do not overwrite main.c)
  const { defaultEngineRoot } = require("consts");
  if (fs.existsSync(defaultEngineRoot)) {
    const engineSrc = Path.join(defaultEngineRoot, "src");
    const engineInclude = Path.join(defaultEngineRoot, "include");
    if (fs.existsSync(engineSrc)) {
      await fs.copy(engineSrc, Path.join(buildRoot, "src"), { overwrite: true, errorOnExist: false });
    }
    if (fs.existsSync(engineInclude)) {
      await fs.copy(engineInclude, Path.join(buildRoot, "include"), { overwrite: true, errorOnExist: false });
    }
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

  const targetSystem = data?.settings?.targetSystem || "pce";

  let targetLabel = "PC Engine HuCard (.PCE ROM)";
  let targetFlag = "";
  if (targetSystem === "sgx") {
    targetLabel = "SuperGrafx (.SGX ROM)";
    targetFlag = "-sgx ";
  } else if (targetSystem === "iso" || targetSystem === "cd" || targetSystem === "scd") {
    targetLabel = "Super CD-ROM² (.ISO Track Image)";
    targetFlag = "-scd ";
  }

  progress(`Running HuC compiler (${targetLabel})...`);

  const cmd = `"${hucExe}" ${targetFlag}main.c`;
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: buildRoot,
      env,
    });

    if (stderr && stderr.trim().length > 0) {
      warnings(stderr);
    }

    progress(`HuC compilation output:\n${stdout}`);

    // Verify that CONST_BANK (Bank 2) and all asset data banks did not overflow or overlap
    const symPath = Path.join(buildRoot, "main.sym");
    if (fs.existsSync(symPath)) {
      const symContent = await fs.readFile(symPath, "utf8");
      const lines = symContent.split("\n");
      const bankSymbols = new Map<number, Array<{ name: string; addr: number }>>();
      let maxBank = 0;

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const bankHex = parts[0];
          if (!/^[0-9a-fA-F]{1,2}$/.test(bankHex)) continue;
          const bankNum = parseInt(bankHex, 16);
          const addr = parseInt(parts[1], 16);
          const symName = parts[2];

          if (bankNum < 200 && bankNum > maxBank) {
            maxBank = bankNum;
          }

          // Check Bank 2 (CONST_BANK) overflow past $5FFF
          // Constant data (strings, raw tables) is placed at $4000-$5FFF. __huc_rodata_end marks the end.
          if (bankNum === 2 && symName === "__huc_rodata_end" && addr >= 0x6000) {
            throw new Error(
              `CRITICAL BUILD ERROR: CONST_BANK (Bank 2) overflow detected at symbol '${symName}' (address $${parts[1]}). ` +
              `Bank 2 maximum address is $5FFF (8192 bytes). Overflow corrupts dialogues and game memory.`
            );
          }

          // Check PC Engine 128-bank (1MB) hardware limit (HuCard and SGX)
          if (targetSystem !== "iso" && targetSystem !== "cd" && bankNum > 127 && bankNum < 200) {
            throw new Error(
              `CRITICAL BUILD ERROR: ROM bank index out of range ($${bankHex} / ${bankNum} > 127). ` +
              `PC Engine standard ROMs are limited to 128 banks (1 Megabyte).`
            );
          }

          // Check asset symbols: all assets (.org $6000) must stay within $6000-$7FFF (8192 bytes)
          const isAssetSymbol =
            symName.startsWith("_bg_") ||
            symName.startsWith("_actor_sc") ||
            symName.startsWith("_player_spr_") ||
            symName.startsWith("_col_data_") ||
            symName.startsWith("col_data_") ||
            symName.startsWith("_song_") ||
            symName.startsWith("_proj_") ||
            symName.startsWith("_ui_frame_");

          if (isAssetSymbol) {
            if (addr >= 0x8000) {
              throw new Error(
                `CRITICAL BUILD ERROR: Asset bank overflow detected in Bank $${bankHex} (${bankNum}) at symbol '${symName}' (address $${parts[1]}). ` +
                `Assets mapped to MPR3 must remain within $6000-$7FFF (8192 bytes). Overflow corrupts sprites, collisions, or music.`
              );
            }

            if (!bankSymbols.has(bankNum)) {
              bankSymbols.set(bankNum, []);
            }
            bankSymbols.get(bankNum)!.push({ name: symName, addr });
          }
        }
      }

      // Check for illegal bank overlap: background banks must never contain non-background assets
      for (const [bNum, symbols] of bankSymbols.entries()) {
        const hasBg = symbols.some(s => s.name.startsWith("_bg_file_"));
        const hasOtherAsset = symbols.some(s =>
          s.name.startsWith("_ui_frame_") ||
          s.name.startsWith("_col_data_") ||
          s.name.startsWith("_actor_sc") ||
          s.name.startsWith("_player_spr_") ||
          s.name.startsWith("_proj_")
        );
        if (hasBg && hasOtherAsset) {
          const names = symbols.map(s => s.name).join(", ");
          throw new Error(
            `CRITICAL BUILD ERROR: Illegal bank collision in Bank $${bNum.toString(16).toUpperCase()} (${bNum}). ` +
            `Dedicated background data collided with other game assets: [${names}].`
          );
        }
      }

      progress(`[ROM Bank Validator] All checks passed! Max bank: ${maxBank}/127 (${Math.round(((maxBank + 1) / 128) * 100)}% capacity used).`);
    }
  } catch (err: any) {
    const errText = (err.stdout ? String(err.stdout) : "") + "\n" + (err.stderr ? String(err.stderr) : "");
    const cleanErr = errText.trim() || err.message || "HuC compilation failed";
    warnings(cleanErr);
    throw new Error(cleanErr);
  }

  // Create target rom directory (build/rom)
  const romDir = Path.basename(buildRoot) === "build"
    ? Path.join(buildRoot, "rom")
    : Path.join(buildRoot, "build", "rom");
  await fs.ensureDir(romDir);

  const defaultOutputPce = Path.join(buildRoot, "main.pce");
  const defaultOutputSgx = Path.join(buildRoot, "main.sgx");
  const defaultOutputIso = Path.join(buildRoot, "main.iso");
  const defaultOutputCue = Path.join(buildRoot, "main.cue");

  const defaultExt = targetSystem === "iso" || targetSystem === "cd" ? "iso" : targetSystem === "sgx" ? "sgx" : "pce";
  const targetOutputRom = Path.join(romDir, romFilename || `game.${defaultExt}`);

  if (targetSystem === "iso" || targetSystem === "cd") {
    if (fs.existsSync(defaultOutputIso)) {
      await fs.move(defaultOutputIso, targetOutputRom, { overwrite: true });
    }
    const targetOutputCue = Path.join(romDir, (romFilename || "game").replace(/\.[^/.]+$/, "") + ".cue");
    if (fs.existsSync(defaultOutputCue)) {
      await fs.move(defaultOutputCue, targetOutputCue, { overwrite: true });
    } else if (fs.existsSync(targetOutputRom)) {
      // Auto-generate standard single-track data CUE sheet for PC Engine emulators
      const isoBase = Path.basename(targetOutputRom);
      const cueContent = `FILE "${isoBase}" BINARY\n  TRACK 01 MODE1/2048\n    INDEX 01 00:00:00\n`;
      await fs.writeFile(targetOutputCue, cueContent, "utf8");
    }
  } else if (targetSystem === "sgx") {
    if (fs.existsSync(defaultOutputSgx)) {
      await fs.move(defaultOutputSgx, targetOutputRom, { overwrite: true });
    } else if (fs.existsSync(defaultOutputPce)) {
      await fs.move(defaultOutputPce, targetOutputRom, { overwrite: true });
    }
  } else {
    if (fs.existsSync(defaultOutputPce)) {
      await fs.move(defaultOutputPce, targetOutputRom, { overwrite: true });
    }
  }

  progress(`Successfully generated output at ${targetOutputRom}`);
  return targetOutputRom;
};

export default makeBuild;
