#define PCE_ACTOR_C 1
#include "include/actor.h"
#include "include/engine.h"

int g_actor_active[PCE_MAX_ACTORS];
int g_actor_hidden[PCE_MAX_ACTORS];
int g_actor_x[PCE_MAX_ACTORS];
int g_actor_y[PCE_MAX_ACTORS];
int g_actor_tile_id[PCE_MAX_ACTORS];
int g_actor_palette[PCE_MAX_ACTORS];
unsigned char g_actor_size[PCE_MAX_ACTORS];
int g_actor_dir[PCE_MAX_ACTORS];
int g_actor_anim_frame[PCE_MAX_ACTORS];
int g_actor_sprite_handle[PCE_MAX_ACTORS];
int g_actor_count;

void actor_init(void) {
    int i;
    init_satb();
    g_actor_count = 0;
    for (i = 0; i < PCE_MAX_ACTORS; i++) {
        g_actor_active[i] = 0;
        g_actor_hidden[i] = 0;
        g_actor_x[i] = 0;
        g_actor_y[i] = 0;
        g_actor_tile_id[i] = 0;
        g_actor_palette[i] = 0;
        g_actor_size[i] = SZ_16x16;
        g_actor_dir[i] = 0;
        g_actor_anim_frame[i] = 0;
        g_actor_sprite_handle[i] = i * 2;
    }
}

int actor_spawn(int x, int y, int tile_id, int palette, int size) {
    int id;
    if (g_actor_count >= PCE_MAX_ACTORS) return -1;
    id = g_actor_count;
    g_actor_count++;
    g_actor_active[id] = 1;
    g_actor_hidden[id] = 0;
    g_actor_x[id] = x;
    g_actor_y[id] = y;
    g_actor_tile_id[id] = tile_id;
    g_actor_palette[id] = palette;
    g_actor_size[id] = (unsigned char)size;
    return id;
}

void actor_update_all(void) {
    int i, flip;
    for (i = 0; i < g_actor_count; i++) {
        if (!g_actor_active[i] || g_actor_hidden[i] || g_current_scene_type == SCENE_TYPE_LOGO) {
            spr_set(g_actor_sprite_handle[i]);
            spr_hide();
            if (g_actor_sprite_handle[i] + 16 < 64) {
                spr_set(g_actor_sprite_handle[i] + 16);
                spr_hide();
            }
            continue;
        }

        flip = (i > 0 && g_actor_dir[i] == 1) ? FLIP_X : NO_FLIP;

        // Top tile (Head / Upper body)
        spr_set(g_actor_sprite_handle[i]);
        spr_x(g_actor_x[i]);
        spr_y(g_actor_y[i]);
        spr_pattern(g_actor_tile_id[i]);
        spr_pal(g_actor_palette[i]);
        spr_pri(1);
        spr_ctrl(0xFF, SZ_16x16 | flip);

        // If 16x32, render bottom tile (Body & Legs) stacked at Y + 16
        if (g_actor_size[i] == SZ_16x32) {
            spr_set(g_actor_sprite_handle[i] + 16);
            spr_x(g_actor_x[i]);
            spr_y(g_actor_y[i] + 16);
            spr_pattern(g_actor_tile_id[i] + 0x40);
            spr_pal(g_actor_palette[i]);
            spr_pri(1);
            spr_ctrl(0xFF, SZ_16x16 | flip);
        } else {
            if (g_actor_sprite_handle[i] + 16 < 64) {
                spr_set(g_actor_sprite_handle[i] + 16);
                spr_hide();
            }
        }
    }
    satb_update();
}

void actor_set_pos(int id, int x, int y) {
    if (id >= 0 && id < g_actor_count) {
        g_actor_x[id] = x;
        g_actor_y[id] = y;
    }
}

void actor_set_dir(int id, int dir) {
    if (id >= 0 && id < g_actor_count) {
        g_actor_dir[id] = dir;
    }
}

void actor_hide(int id) {
    if (id >= 0 && id < PCE_MAX_ACTORS) {
        g_actor_hidden[id] = 1;
    }
}

void actor_show(int id) {
    if (id >= 0 && id < PCE_MAX_ACTORS) {
        g_actor_hidden[id] = 0;
    }
}

void actor_set_hidden(int id, int hidden) {
    if (id >= 0 && id < PCE_MAX_ACTORS) {
        g_actor_hidden[id] = hidden;
    }
}
