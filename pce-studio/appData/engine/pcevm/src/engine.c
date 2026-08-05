#include "include/engine.h"

void engine_init(void) {
    pce_sys_init();
    actor_init();
    camera_init();
    trigger_init();
    vm_init();
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
