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

export const convertWavToRawBin = (wavBuffer: Buffer): Buffer => {
  let offset = 12;
  let channels = 2;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString("ascii", offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);
    if (chunkId === "fmt ") {
      channels = wavBuffer.readUInt16LE(offset + 10);
      bitsPerSample = wavBuffer.readUInt16LE(offset + 22);
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataSize = Math.min(chunkSize, wavBuffer.length - dataOffset);
      break;
    }
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }

  if (dataOffset === -1) {
    dataOffset = Math.min(44, wavBuffer.length);
    dataSize = wavBuffer.length - dataOffset;
  }

  let pcmData = wavBuffer.subarray(dataOffset, dataOffset + dataSize);

  // If mono 16-bit, duplicate to stereo
  if (channels === 1 && bitsPerSample === 16) {
    const stereoBuffer = Buffer.alloc(pcmData.length * 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      const sample = pcmData.readInt16LE(i);
      stereoBuffer.writeInt16LE(sample, i * 2);
      stereoBuffer.writeInt16LE(sample, i * 2 + 2);
    }
    pcmData = stereoBuffer;
  }

  // Sector-align to 2352 bytes (standard Red Book CD-DA sector size)
  const remainder = pcmData.length % 2352;
  if (remainder !== 0) {
    const padBytes = 2352 - remainder;
    pcmData = Buffer.concat([pcmData, Buffer.alloc(padBytes)]);
  }

  return pcmData;
};

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
  const sf2Enabled = Boolean(data?.settings?.sf2Enabled);
  const isCD = targetSystem === "iso" || targetSystem === "cd" || targetSystem === "scd";

  let targetLabel = "PC Engine HuCard (.PCE ROM)";
  let targetFlag = "";
  if (targetSystem === "sgx") {
    targetLabel = sf2Enabled ? "SuperGrafx + SF2 Mapper (.SGX ROM)" : "SuperGrafx (.SGX ROM)";
    targetFlag = "-sgx ";
  } else if (isCD) {
    targetLabel = "Super CD-ROM² (.ISO Track Image)";
    targetFlag = "-scd ";
  } else if (sf2Enabled) {
    targetLabel = "PC Engine HuCard + SF2 Mapper (.PCE ROM)";
  }

  progress(`Running HuC compiler (${targetLabel})...`);

  try {
    // Step 1: Run HuC to compile C source into assembly (main.s)
    const hucCmd = `"${hucExe}" -s ${targetFlag}main.c`;
    const hucRes = await execAsync(hucCmd, {
      cwd: buildRoot,
      env,
    });

    if (hucRes.stderr && hucRes.stderr.trim().length > 0) {
      warnings(hucRes.stderr);
    }

    // Step 2: Run PCEAS with -O and --strip to strip unused procedures and optimize bank packing
    let pceasTarget = "-raw -pad ";
    if (isCD) {
      pceasTarget = "-scd ";
    } else if (sf2Enabled) {
      pceasTarget = "--sf2 -raw ";
    }

    const pceasCmd = `"${pceasExe}" -O --strip ${pceasTarget}main.s`;
    const { stdout, stderr } = await execAsync(pceasCmd, {
      cwd: buildRoot,
      env,
    });

    if (stderr && stderr.trim().length > 0) {
      warnings(stderr);
    }

    progress(`HuC & PCEAS compilation output:\n${stdout}`);

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

          // Check PC Engine hardware bank limits
          if (!isCD) {
            if (sf2Enabled) {
              // SF2 Mapper supports up to 1024 banks (8 Megabytes)
              if (bankNum > 1023) {
                throw new Error(
                  `CRITICAL BUILD ERROR: ROM bank index out of range ($${bankHex} / ${bankNum} > 1023). ` +
                  `Street Fighter II mapper ROMs are limited to 1,024 banks (8 Megabytes).`
                );
              }
            } else if (bankNum > 127 && bankNum < 200) {
              throw new Error(
                `CRITICAL BUILD ERROR: ROM bank index out of range ($${bankHex} / ${bankNum} > 127). ` +
                `PC Engine standard ROMs are limited to 128 banks (1 Megabyte). Enable the Street Fighter II Mapper in Project Settings to support up to 8 Megabytes.`
              );
            }
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

      // Check for illegal bank overlap: dedicated background CHR banks must never contain non-background assets
      for (const [bNum, symbols] of bankSymbols.entries()) {
        const hasBg = symbols.some(s => s.name.startsWith("_bg_file_") && s.name.endsWith("_chr"));
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

      const capacityBanks = sf2Enabled ? 1024 : isCD ? 32 : 128;
      progress(`[ROM Bank Validator] All checks passed! Max bank: ${maxBank}/${capacityBanks - 1} (${Math.round(((maxBank + 1) / capacityBanks) * 100)}% capacity used).`);
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

  const defaultExt = targetSystem === "iso" || targetSystem === "cd" || targetSystem === "scd" ? "iso" : targetSystem === "sgx" ? "sgx" : "pce";
  const targetOutputRom = Path.join(romDir, romFilename || `game.${defaultExt}`);

  if (targetSystem === "iso" || targetSystem === "cd" || targetSystem === "scd") {
    if (fs.existsSync(defaultOutputIso)) {
      await fs.move(defaultOutputIso, targetOutputRom, { overwrite: true });
    }
    const targetOutputCue = Path.join(romDir, (romFilename || "game").replace(/\.[^/.]+$/, "") + ".cue");

    // Copy any CD-DA audio tracks from buildRoot/audio to romDir
    const cdAudioFormat = (data?.settings?.cdAudioFormat || "wav").toLowerCase();
    const isBinAudio = cdAudioFormat === "bin";
    const audioDir = Path.join(buildRoot, "audio");
    const audioTracks: string[] = [];
    if (fs.existsSync(audioDir)) {
      const wavFiles = (await fs.readdir(audioDir))
        .filter((f: string) => f.toLowerCase().endsWith(".wav"))
        .sort();
      for (const wav of wavFiles) {
        const srcWav = Path.join(audioDir, wav);
        if (isBinAudio) {
          const binName = wav.replace(/\.wav$/i, ".bin");
          const destBin = Path.join(romDir, binName);
          const wavBuf = await fs.readFile(srcWav);
          const rawBin = convertWavToRawBin(wavBuf);
          await fs.writeFile(destBin, rawBin);
          audioTracks.push(binName);
        } else {
          const destWav = Path.join(romDir, wav);
          await fs.copy(srcWav, destWav, { overwrite: true });
          audioTracks.push(wav);
        }
      }
    }

    if (audioTracks.length > 0 && fs.existsSync(targetOutputRom)) {
      // Generate multi-track CUE sheet for PC Engine CD-DA audio playback
      const isoBase = Path.basename(targetOutputRom);
      let cueContent = `FILE "${isoBase}" BINARY\n  TRACK 01 MODE1/2048\n    INDEX 01 00:00:00\n`;
      let trackNum = 2;
      for (const trackFile of audioTracks) {
        const trackStr = trackNum < 10 ? `0${trackNum}` : `${trackNum}`;
        const fileType = isBinAudio ? "BINARY" : "WAVE";
        cueContent += `FILE "${trackFile}" ${fileType}\n  TRACK ${trackStr} AUDIO\n    PREGAP 00:02:00\n    INDEX 01 00:00:00\n`;
        trackNum++;
      }
      await fs.writeFile(targetOutputCue, cueContent, "utf8");
    } else if (fs.existsSync(defaultOutputCue)) {
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
