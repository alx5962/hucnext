const fs = require("fs");
const path = require("path");

const tmpDir = "C:\\Users\\alx59\\AppData\\Local\\Temp\\_pcebuild";
for (const f of ["bg_scene_tileset.c", "bg_scene_tilemap.c", "palette_0.c", "sprite_actor_animated_tileset.c"]) {
  const p = path.join(tmpDir, f);
  if (fs.existsSync(p)) {
    console.log(`=== ${f} ===`);
    console.log(fs.readFileSync(p, "utf8").substring(0, 400));
  }
}
