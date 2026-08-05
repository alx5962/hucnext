#include "include/actor.h"

pce_actor_t g_actors[PCE_MAX_ACTORS];
int g_actor_count;

void actor_init(void) {
    int i;
    g_actor_count = 0;
    for (i = 0; i < PCE_MAX_ACTORS; i++) {
        g_actors[i].active = 0;
        g_actors[i].x = 0;
        g_actors[i].y = 0;
        g_actors[i].tile_id = 0;
        g_actors[i].palette = 0;
        g_actors[i].dir = 0;
        g_actors[i].anim_frame = 0;
        g_actors[i].sprite_handle = i;
    }
}

int actor_spawn(int x, int y, int tile_id, int palette) {
    int id;
    if (g_actor_count >= PCE_MAX_ACTORS) return -1;
    id = g_actor_count;
    g_actor_count++;
    g_actors[id].active = 1;
    g_actors[id].x = x;
    g_actors[id].y = y;
    g_actors[id].tile_id = tile_id;
    g_actors[id].palette = palette;
    return id;
}

void actor_update_all(void) {
    int i;
    for (i = 0; i < g_actor_count; i++) {
        if (!g_actors[i].active) continue;
        spr_set(g_actors[i].sprite_handle);
        spr_x(g_actors[i].x);
        spr_y(g_actors[i].y);
        spr_pattern(g_actors[i].tile_id);
        spr_pal(16 + g_actors[i].palette);
        spr_ctrl(SIZE_MAS | FLIP_MAS, SZ_16x16 | NO_FLIP);
    }
}

void actor_set_pos(int id, int x, int y) {
    if (id >= 0 && id < PCE_MAX_ACTORS) {
        g_actors[id].x = x;
        g_actors[id].y = y;
    }
}

void actor_set_dir(int id, int dir) {
    if (id >= 0 && id < PCE_MAX_ACTORS) {
        g_actors[id].dir = dir;
    }
}
