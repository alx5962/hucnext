/*
 * PCE Studio Engine Main Entry Point
 * Compiled with HuC (PC Engine C Compiler)
 */

#include <huc.h>

#incchr(bg_scene1_chr, "assets/backgrounds/scene.png")
#incpal(bg_scene1_pal, "assets/backgrounds/scene.png")
#incbat(bg_scene1_bat, "assets/backgrounds/scene.png", 0x1000, 32, 28)

#incchr(bg_scene2_chr, "assets/backgrounds/scene2.png")
#incpal(bg_scene2_pal, "assets/backgrounds/scene2.png")
#incbat(bg_scene2_bat, "assets/backgrounds/scene2.png", 0x1000, 32, 28)

#incspr(player_spr, "assets/sprites/iso_hero.pcx", 0, 0, 4, 1)
#incpal(player_pal, "assets/sprites/iso_hero.pcx")

#incspr(actor1_spr, "assets/sprites/actor.pcx", 0, 0, 2, 1)
#incpal(actor1_pal, "assets/sprites/actor.pcx")

#define PLAYER_START_X 104
#define PLAYER_START_Y 112
#define HAS_SCENE_2 1
#define HAS_ACTOR_1 1
#define ACTOR_1_X 200
#define ACTOR_1_Y 32

#define HAS_ACTOR_SCENE_1 1
#define ACTOR_SCENE_1_X 200
#define ACTOR_SCENE_1_Y 32

#define HAS_ACTOR_SCENE_2 1
#define ACTOR_SCENE_2_X 40
#define ACTOR_SCENE_2_Y 40

#define HAS_TRIGGER_1 1
#define TRIGGER_1_SCENE 1
#define TRIGGER_1_X 29
#define TRIGGER_1_Y 2
#define TRIGGER_1_W 3
#define TRIGGER_1_H 14
#define TRIGGER_1_TARGET_SCENE 2
#define TRIGGER_1_TARGET_X 72
#define TRIGGER_1_TARGET_Y 80

#define HAS_TRIGGER_2 1
#define TRIGGER_2_SCENE 2
#define TRIGGER_2_X 0
#define TRIGGER_2_Y 2
#define TRIGGER_2_W 3
#define TRIGGER_2_H 14
#define TRIGGER_2_TARGET_SCENE 1
#define TRIGGER_2_TARGET_X 160
#define TRIGGER_2_TARGET_Y 56

#ifndef MAIN_C
#define MAIN_C

#include "include/engine.h"
#include "src/pce_system.c"
#include "src/actor.c"
#include "src/camera.c"
#include "src/collision.c"
#include "src/trigger.c"
#include "src/vm.c"
#include "src/engine.c"
#include "game_includes.h"

main() {
    engine_run();
}

#endif
