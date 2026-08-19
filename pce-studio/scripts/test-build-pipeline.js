const path = require("path");
const fs = require("fs-extra");
const os = require("os");

(async () => {
  try {
    const projectPath = "c:\\workspace\\git\\hucnext\\pce-studio\\appData\\templates\\gbhtml\\project";
    const testBuildDir = path.join(os.tmpdir(), `_pcebuild_test_${Date.now()}`);
    await fs.ensureDir(testBuildDir);

    console.log("Test build directory:", testBuildDir);

    // 1. Copy engine files
    const engineRoot = path.resolve(__dirname, "../appData/engine/pcevm");
    await fs.copy(engineRoot, testBuildDir, { overwrite: true });

    // 2. Run makeBuild
    const makeBuild = require("../src/lib/compiler/makeBuild").default;
    
    // Create a minimal main.c to test makeBuild
    const mainCPath = path.join(testBuildDir, "main.c");
    fs.writeFileSync(mainCPath, `#include "include/engine.h"\nmain() { engine_run(); }\n`);

    console.log("Running makeBuild...");
    const romPath = await makeBuild({
      buildRoot: testBuildDir,
      romFilename: "test.pce",
      tmpPath: testBuildDir,
      progress: (msg) => console.log("[Progress]", msg),
      warnings: (msg) => console.warn("[Warning]", msg),
    });

    console.log("Successfully built ROM at:", romPath);
    console.log("ROM file exists:", fs.existsSync(romPath));

    // Cleanup
    await fs.remove(testBuildDir);
    console.log("Cleaned up test directory!");
  } catch (err) {
    console.error("Pipeline test error:", err);
  }
})();
