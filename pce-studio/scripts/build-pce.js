const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

async function runTestBuild() {
  console.log("=== PCE Studio Test Build Runner ===");
  
  const hucExe = path.resolve(__dirname, "../../bin/huc.exe");
  const pceasExe = path.resolve(__dirname, "../../bin/pceas.exe");
  const buildDir = path.resolve(__dirname, "../build_tmp");
  const engineDir = path.resolve(__dirname, "../appData/engine/pcevm");
  const rawIncludeDir = path.resolve(__dirname, "../../include/huc");

  // Compute relative path from buildDir to rawIncludeDir using forward slashes
  let includeDir = path.relative(buildDir, rawIncludeDir).replace(/\\/g, "/");

  console.log(`HuC Exe: ${hucExe}`);
  console.log(`PCEAS Exe: ${pceasExe}`);
  console.log(`Include Dir (relative): ${includeDir}`);

  if (!fs.existsSync(hucExe) || !fs.existsSync(pceasExe)) {
    console.error("Error: HuC toolchain missing in bin/");
    process.exit(1);
  }

  console.log(`Copying engine from ${engineDir} to ${buildDir}...`);
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });
  fs.cpSync(engineDir, buildDir, { recursive: true });

  console.log("Executing HuC compilation...");
  const env = {
    ...process.env,
    PCE_INCLUDE: includeDir,
    PCE_PCEAS: pceasExe,
  };

  try {
    const cmd = `"${hucExe}" main.c`;
    console.log(`Command: ${cmd}`);
    const output = execSync(cmd, { cwd: buildDir, env, encoding: "utf8" });
    console.log("Compiler Output:\n" + output);

    const generatedPce = path.join(buildDir, "main.pce");
    if (fs.existsSync(generatedPce)) {
      const stats = fs.statSync(generatedPce);
      console.log(`====================================================`);
      console.log(`SUCCESS! Generated PC Engine ROM: ${generatedPce} (${stats.size} bytes)`);
      console.log(`====================================================`);
    } else {
      console.error("ERROR: main.pce was not generated.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Compilation failed:", err.message);
    if (err.stdout) console.log("STDOUT:", err.stdout);
    if (err.stderr) console.log("STDERR:", err.stderr);
    process.exit(1);
  }
}

runTestBuild();
