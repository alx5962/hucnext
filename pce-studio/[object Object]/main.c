
#include <huc.h>
#include "include/engine.h"

#incspr(player_spr, "assets/sprites/iso_hero.pcx", 0, 0, 1, 1)
#incpal(player_pal, "assets/sprites/iso_hero.pcx")

#incchr(bg_scene1_chr, "assets/backgrounds/scene1.png", 0, 0, 32, 28)
#incpal(bg_scene1_pal, "assets/backgrounds/scene1.png")
#incbat(bg_scene1_bat, "assets/backgrounds/scene1.png", 0x1000, 32, 28)

#incchr(bg_scene2_chr, "assets/backgrounds/scene2.png", 0, 0, 32, 28)
#incpal(bg_scene2_pal, "assets/backgrounds/scene2.png")
#incbat(bg_scene2_bat, "assets/backgrounds/scene2.png", 0x1000, 32, 28)



#define PLAYER_START_X 104
#define PLAYER_START_Y 112
#define HAS_SCENE_2 1
#define HAS_MUSIC_DATA 1





#include "src/pce_sound.c"
#include "music/song_0.c"

#include "src/engine.c"
#include "src/actor.c"
#include "src/camera.c"
#include "src/collision.c"
#include "src/trigger.c"
#include "src/vm.c"
#include "src/pce_system.c"

main() {
    engine_run();
}
