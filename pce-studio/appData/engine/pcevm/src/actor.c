#define PCE_ACTOR_C 1
#include "include/actor.h"
#include "include/engine.h"

void actor_init(void) {
    int i;
    init_satb();
    for (i = 0; i < 64; i++) {
        spr_set(i);
        spr_x(512);
        spr_y(512);
        spr_hide();
    }
    satb_update();
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
        g_actor_sprite_handle[i] = i;
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
    int screen_x, screen_y;
    for (i = 0; i < g_actor_count; i++) {
        if (!g_actor_active[i] || g_actor_hidden[i] || g_current_scene_type == SCENE_TYPE_LOGO) {
            spr_set(g_actor_sprite_handle[i]);
            spr_x(512);
            spr_y(512);
            spr_hide();
            continue;
        }

        screen_x = g_actor_x[i] - g_cam_x;
        screen_y = g_actor_y[i] - g_cam_y;

        flip = (i > 0 && g_actor_dir[i] == 1) ? FLIP_X : NO_FLIP;

        if ((g_dialogue_active && screen_y >= 168) || screen_x < -64 || screen_x > 256 || screen_y < -64 || screen_y > 224) {
            spr_set(g_actor_sprite_handle[i]);
            spr_x(512);
            spr_y(512);
            spr_hide();
        } else {
            spr_set(g_actor_sprite_handle[i]);
            spr_x(screen_x);
            spr_y(screen_y);
            spr_pattern(g_actor_tile_id[i]);
            spr_pal(g_actor_palette[i]);
            spr_pri(1);
            spr_ctrl(FLIP_MAS | SIZE_MAS, g_actor_size[i] | flip);
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

void actor_activate(int id) {
    if (id >= 0 && id < PCE_MAX_ACTORS) g_actor_active[id] = 1;
}

void actor_deactivate(int id) {
    if (id >= 0 && id < PCE_MAX_ACTORS) g_actor_active[id] = 0;
}

void actor_set_collisions(int id, int enable) {
    if (id >= 0 && id < PCE_MAX_ACTORS) g_actor_collisions_disabled[id] = !enable;
}

void actor_set_pos_rel(int id, int dx, int dy) {
    if (id >= 0 && id < PCE_MAX_ACTORS) {
        g_actor_x[id] += dx;
        g_actor_y[id] += dy;
    }
}

void actor_move_to(int id, int target_x, int target_y) {
    if (id >= 0 && id < PCE_MAX_ACTORS) {
        g_actor_x[id] = target_x;
        g_actor_y[id] = target_y;
    }
}

void actor_set_move_speed(int id, int speed) {
    if (id >= 0 && id < PCE_MAX_ACTORS) g_actor_move_speed[id] = speed;
}

void actor_set_anim_speed(int id, int speed) {
    if (id >= 0 && id < PCE_MAX_ACTORS) g_actor_anim_speed[id] = speed;
}

void actor_set_frame(int id, int frame) {
    if (id >= 0 && id < PCE_MAX_ACTORS) g_actor_anim_frame[id] = frame;
}

void actor_emote(int id, int emote_id) {
    (void)id;
    (void)emote_id;
}

void actor_push(int id, int dir) {
    if (id >= 0 && id < PCE_MAX_ACTORS) {
        if (dir == 0) g_actor_y[id] += 16;
        else if (dir == 1) g_actor_x[id] += 16;
        else if (dir == 2) g_actor_y[id] -= 16;
        else if (dir == 3) g_actor_x[id] -= 16;
    }
}

void actor_effects(int id, int effect_id) {
    (void)id;
    (void)effect_id;
}

void actor_hide_all(void) {
    int i;
    for (i = 0; i < g_actor_count; i++) {
        g_actor_hidden[i] = 1;
    }
}
