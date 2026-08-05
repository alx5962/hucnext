#include "include/engine.h"

extern const unsigned char player_spr[];
extern const unsigned short player_pal[];

void engine_init(void) {
    pce_sys_init();
    actor_init();
    camera_init();
    trigger_init();
    vm_init();

    // Load background image tile patterns, palettes, and tilemap into VRAM/VCE
    load_background(bg_scene_chr, bg_scene_pal, bg_scene_bat, 32, 28);

    // Load player actor sprite pattern into VRAM 0x5000 & sprite palette 16 (palette index 0)
    load_vram(0x5000, player_spr, 0x40);
    load_palette(16, player_pal, 1);

    // Spawn player actor sprite in FOREGROUND at screen position (128, 112)
    actor_spawn(128, 112, 0x5000, 0);
}

void engine_update(void) {
    unsigned int input;
    int dx, dy, new_x, new_y;

    vm_step();

    input = pce_sys_read_joy(0);
    if (g_actor_count > 0 && g_actors[0].active) {
        dx = 0;
        dy = 0;
        if (input & JOY_LEFT)  dx -= 2;
        if (input & JOY_RIGHT) dx += 2;
        if (input & JOY_UP)    dy -= 2;
        if (input & JOY_DOWN)  dy += 2;

        new_x = g_actors[0].x + dx;
        new_y = g_actors[0].y + dy;

        if (collision_check_point(new_x, new_y) == COLLISION_NONE) {
            actor_set_pos(0, new_x, new_y);
        }

        camera_update(g_actors[0].x, g_actors[0].y);
        trigger_check(g_actors[0].x, g_actors[0].y);
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
