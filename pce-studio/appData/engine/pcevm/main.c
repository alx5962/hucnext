/*
 * PCE Studio Engine Main Entry Point
 * Compiled with HuC (PC Engine C Compiler)
 */

#include <huc.h>

#incchr(bg_scene_chr, "assets/backgrounds/scene.png")
#incpal(bg_scene_pal, "assets/backgrounds/scene.png")
#incbat(bg_scene_bat, "assets/backgrounds/scene.png", 0x1000, 32, 28)

#ifndef MAIN_C
#define MAIN_C

#include "include/engine.h"
#include "src/pce_system.c"
#include "src/pce_sound.c"
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
