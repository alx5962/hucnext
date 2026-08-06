const fs = require("fs");
const path = require("path");

const buildDir = path.resolve(__dirname, "../build_tmp");
const mainCPath = path.join(buildDir, "main.c");
let content = fs.readFileSync(mainCPath, "utf8");

// Print SATB bytes in engine_render to debug SATB byte 7
const debugCode = `
void engine_render(void) {
    camera_apply();
    actor_update_all();
    pce_sys_vsync();
}
`;

console.log("=== Debug SATB script ready ===");
