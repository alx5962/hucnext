
#include <huc.h>
#include "include/engine.h"

#incspr(player_spr, "assets/sprites/iso_hero.pcx", 0, 0, 2, 1)
#incpal(player_pal, "assets/sprites/iso_hero.pcx")

#incchr(bg_scene1_chr, "assets/backgrounds/scene.png", 0, 0, 32, 28)
#incpal(bg_scene1_pal, "assets/backgrounds/scene.png")
#incbat(bg_scene1_bat, "assets/backgrounds/scene.png", 0x1000, 32, 28)

#incchr(bg_scene2_chr, "assets/backgrounds/scene3.png", 0, 0, 32, 28)
#incpal(bg_scene2_pal, "assets/backgrounds/scene3.png")
#incbat(bg_scene2_bat, "assets/backgrounds/scene3.png", 0x1000, 32, 28)

#incspr(actor_sc1_spr, "assets/sprites/kidPark_sc1.pcx", 0, 0, 1, 2)
#incpal(actor_sc1_pal, "assets/sprites/kidPark_sc1.pcx")
#incspr(actor_sc2_spr, "assets/sprites/actor_sc2.pcx", 0, 0, 1, 1)
#incpal(actor_sc2_pal, "assets/sprites/actor_sc2.pcx")


#define PLAYER_START_X 40
#define PLAYER_START_Y 80
#define HAS_SCENE_2 1
#define HAS_MUSIC_DATA 1


#define HAS_ACTOR_SCENE_1 1
#define ACTOR_SCENE_1_X 152
#define ACTOR_SCENE_1_Y 40
#define ACTOR_SCENE_1_VRAM_SIZE 0x80
#define ACTOR_SCENE_1_SPRITE_SIZE SZ_16x32
#define HAS_ACTOR_SCENE_2 1
#define ACTOR_SCENE_2_X 32
#define ACTOR_SCENE_2_Y 176
#define ACTOR_SCENE_2_VRAM_SIZE 0x40
#define ACTOR_SCENE_2_SPRITE_SIZE SZ_16x16

#define HAS_TRIGGER_1 1
#define TRIGGER_1_SCENE 1
#define TRIGGER_1_X 232
#define TRIGGER_1_Y 16
#define TRIGGER_1_W 24
#define TRIGGER_1_H 88
#define TRIGGER_1_TARGET_SCENE 2
#define TRIGGER_1_TARGET_X 56
#define TRIGGER_1_TARGET_Y 128
#define HAS_TRIGGER_2 1
#define TRIGGER_2_SCENE 2
#define TRIGGER_2_X 0
#define TRIGGER_2_Y 40
#define TRIGGER_2_W 24
#define TRIGGER_2_H 152
#define TRIGGER_2_TARGET_SCENE 1
#define TRIGGER_2_TARGET_X 192
#define TRIGGER_2_TARGET_Y 80


#include "scene_1_collisions.c"
#include "scene_2_collisions.c"
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
