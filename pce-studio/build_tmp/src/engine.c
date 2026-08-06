#include "include/engine.h"
#include "include/pce_sound.h"



#ifndef PLAYER_START_X
#define PLAYER_START_X 104
#endif

#ifndef PLAYER_START_Y
#define PLAYER_START_Y 112
#endif



int g_current_scene = 1;

void load_scene(int scene_num, int player_x, int player_y) {
    g_current_scene = scene_num;
    if (scene_num == 1) {
        load_background(bg_scene1_chr, bg_scene1_pal, bg_scene1_bat, 32, 28);
        collision_init(scene_1_collisions, 32, 28);
        #ifdef HAS_ACTOR_SCENE_1
        load_vram(0x5400, actor_sc1_spr, ACTOR_SCENE_1_VRAM_SIZE);
        load_palette(17, actor_sc1_pal, 1);
        if (g_actor_count > 1) {
            g_actor_active[1] = 1;
            g_actor_tile_id[1] = 0x5400;
            g_actor_palette[1] = 1;
            g_actor_size[1] = ACTOR_SCENE_1_SPRITE_SIZE;
            actor_set_pos(1, ACTOR_SCENE_1_X, ACTOR_SCENE_1_Y);
        }
        #else
        if (g_actor_count > 1) {
            g_actor_active[1] = 0;
        }
        #endif
    }
    #ifdef HAS_SCENE_2
    else if (scene_num == 2) {
        load_background(bg_scene2_chr, bg_scene2_pal, bg_scene2_bat, 32, 28);
        collision_init(scene_2_collisions, 32, 28);
        #ifdef HAS_ACTOR_SCENE_2
        load_vram(0x5400, actor_sc2_spr, ACTOR_SCENE_2_VRAM_SIZE);
        load_palette(17, actor_sc2_pal, 1);
        if (g_actor_count > 1) {
            g_actor_active[1] = 1;
            g_actor_tile_id[1] = 0x5400;
            g_actor_palette[1] = 1;
            g_actor_size[1] = ACTOR_SCENE_2_SPRITE_SIZE;
            actor_set_pos(1, ACTOR_SCENE_2_X, ACTOR_SCENE_2_Y);
        }
        #else
        if (g_actor_count > 1) {
            g_actor_active[1] = 0;
        }
        #endif
    }
    #endif

    if (g_actor_count > 0) {
        actor_set_pos(0, player_x, player_y);
    }
}



void engine_init(void) {
    pce_sys_init();
    pce_sound_init();
    #ifdef HAS_MUSIC_DATA
    pce_sound_play(song_0_Data);
    #endif
    actor_init();
    camera_init();
    trigger_init();
    vm_init();

    #ifdef HAS_TRIGGER_1
    trigger_add(TRIGGER_1_SCENE, TRIGGER_1_X, TRIGGER_1_Y, TRIGGER_1_W, TRIGGER_1_H, TRIGGER_1_TARGET_SCENE, TRIGGER_1_TARGET_X, TRIGGER_1_TARGET_Y, (void*)0);
    #endif

    #ifdef HAS_TRIGGER_2
    trigger_add(TRIGGER_2_SCENE, TRIGGER_2_X, TRIGGER_2_Y, TRIGGER_2_W, TRIGGER_2_H, TRIGGER_2_TARGET_SCENE, TRIGGER_2_TARGET_X, TRIGGER_2_TARGET_Y, (void*)0);
    #endif

    #ifdef HAS_TRIGGER_3
    trigger_add(TRIGGER_3_SCENE, TRIGGER_3_X, TRIGGER_3_Y, TRIGGER_3_W, TRIGGER_3_H, TRIGGER_3_TARGET_SCENE, TRIGGER_3_TARGET_X, TRIGGER_3_TARGET_Y, (void*)0);
    #endif

    #ifdef HAS_TRIGGER_4
    trigger_add(TRIGGER_4_SCENE, TRIGGER_4_X, TRIGGER_4_Y, TRIGGER_4_W, TRIGGER_4_H, TRIGGER_4_TARGET_SCENE, TRIGGER_4_TARGET_X, TRIGGER_4_TARGET_Y, (void*)0);
    #endif

    // Load player actor sprite pattern into VRAM 0x5000 & sprite palette 16
    load_vram(0x5000, player_spr, 0x40);
    load_palette(16, player_pal, 1);

    // Spawn main player actor sprite at start position
    actor_spawn(PLAYER_START_X, PLAYER_START_Y, 0x5000, 0, SZ_16x16);

    // Reserve slot for scene actor 1
    actor_spawn(0, 0, 0x5400, 1, SZ_16x16);

    load_scene(1, PLAYER_START_X, PLAYER_START_Y);
}

void engine_update(void) {
    unsigned int input;
    int dx, dy, new_x, new_y;

    vm_step();
    pce_sound_update();

    input = pce_sys_read_joy(0);
    if (g_actor_count > 0 && g_actor_active[0]) {
        dx = 0;
        dy = 0;
        if (input & JOY_LEFT)  dx -= 2;
        if (input & JOY_RIGHT) dx += 2;
        if (input & JOY_UP)    dy -= 2;
        if (input & JOY_DOWN)  dy += 2;

        new_x = g_actor_x[0] + dx;
        if (!collision_check_box(new_x, g_actor_y[0])) {
            g_actor_x[0] = new_x;
        }

        new_y = g_actor_y[0] + dy;
        if (!collision_check_box(g_actor_x[0], new_y)) {
            g_actor_y[0] = new_y;
        }

        camera_update(g_actor_x[0], g_actor_y[0]);
        trigger_check(g_actor_x[0], g_actor_y[0]);
    }
}

void engine_render(void) {
    camera_apply();
    actor_update_all();
    pce_sys_vsync();
}

void engine_run(void) {
    engine_init();
    for (;;) {
        engine_update();
        engine_render();
    }
}
