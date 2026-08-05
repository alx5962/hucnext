#include "include/engine.h"

extern const unsigned char player_spr[];
extern const unsigned short player_pal[];
extern const unsigned char scene_1_collisions[];

void engine_init(void) {
    pce_sys_init();
    actor_init();
    camera_init();
    trigger_init();
    vm_init();
    collision_init(scene_1_collisions, 32, 28);

    // Load background image tile patterns, palettes, and tilemap into VRAM/VCE
    load_background(bg_scene_chr, bg_scene_pal, bg_scene_bat, 32, 28);

    // Load player actor sprite pattern into VRAM 0x5000 & sprite palette 16
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
        if (!collision_check_box(new_x, g_actors[0].y)) {
            g_actors[0].x = new_x;
        }

        new_y = g_actors[0].y + dy;
        if (!collision_check_box(g_actors[0].x, new_y)) {
            g_actors[0].y = new_y;
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
