#ifndef PCE_ENGINE_H
#define PCE_ENGINE_H

#include "include/pce_system.h"
#include "include/actor.h"
#include "include/camera.h"
#include "include/collision.h"
#include "include/trigger.h"
#include "include/vm.h"

extern int g_current_scene;
extern int g_current_scene_type;
extern int g_wait_timer;

void show_dialogue(const char *msg);
void hide_dialogue(void);
void load_scene(int scene_num, int player_x, int player_y);

/* Scene type constants */
#define SCENE_TYPE_TOPDOWN      0
#define SCENE_TYPE_PLATFORM     1
#define SCENE_TYPE_ADVENTURE    2
#define SCENE_TYPE_SHMUP        3
#define SCENE_TYPE_POINTNCLICK  4
#define SCENE_TYPE_LOGO         5

#ifndef SCENE_1_TYPE
#define SCENE_1_TYPE SCENE_TYPE_TOPDOWN
#endif
#ifndef SCENE_2_TYPE
#define SCENE_2_TYPE SCENE_TYPE_TOPDOWN
#endif
#ifndef SCENE_TYPE
#define SCENE_TYPE SCENE_TYPE_TOPDOWN
#endif

/* Platform physics */
#ifndef PLAT_GRAVITY
#define PLAT_GRAVITY    3
#endif
#ifndef PLAT_JUMP_SUBPX
#define PLAT_JUMP_SUBPX 35
#endif
#ifndef PLAT_WALK_SUBPX
#define PLAT_WALK_SUBPX 12
#endif
#ifndef PLAT_MAX_FALL
#define PLAT_MAX_FALL   39
#endif

/* Adventure / Top-down speeds */
#ifndef TOPDOWN_SPEED
#define TOPDOWN_SPEED   2
#endif
#ifndef ADVENTURE_SPEED
#define ADVENTURE_SPEED 1
#endif

/* SHMUP auto-scroll */
#ifndef SHMUP_SCROLL_SPEED
#define SHMUP_SCROLL_SPEED 1
#endif
#ifndef SHMUP_PLAYER_SPEED
#define SHMUP_PLAYER_SPEED 2
#endif

/* Engine API */
void engine_init(void);
void engine_update(void);
void engine_render(void);
void engine_run(void);

#endif
