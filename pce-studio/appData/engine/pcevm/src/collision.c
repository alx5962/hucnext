#define PCE_COLLISION_C 1
#include "include/collision.h"
#include "include/actor.h"

int collision_check_tile(int tile_x, int tile_y) {
    if (tile_x < 0 || tile_x >= g_collision_width || tile_y < 0 || tile_y >= g_collision_height) {
        return COLLISION_SOLID;
    }
    return map_get_tile(tile_x, tile_y);
}

int collision_check_point(int px, int py) {
    return collision_check_tile(px >> 3, py >> 3);
}

int collision_check_box(int x, int y) {
    int x_left, x_right, y_top, y_bottom;
    int tx1, tx2, ty1, ty2;
    int i, act_l, act_r, act_t, act_b;

    x_left = x + g_player_bbox_left;
    x_right = x + g_player_bbox_right;
    y_top = y + g_player_bbox_top;
    y_bottom = y + g_player_bbox_bottom;

    if (x_left < 0 || y_top < 0) return 1;
    tx1 = x_left >> 3;
    tx2 = x_right >> 3;
    ty1 = y_top >> 3;
    ty2 = y_bottom >> 3;

    if (tx2 >= g_collision_width || ty2 >= g_collision_height) return 1;

    /* Tile map collisions */
    if (collision_check_tile(tx1, ty1) != COLLISION_NONE) return 1;
    if (tx2 != tx1 && collision_check_tile(tx2, ty1) != COLLISION_NONE) return 1;
    if (ty2 != ty1 && collision_check_tile(tx1, ty2) != COLLISION_NONE) return 1;
    if (tx2 != tx1 && ty2 != ty1 && collision_check_tile(tx2, ty2) != COLLISION_NONE) return 1;

    /* Solid actor collisions (prevents player from walking over actors) */
    for (i = 1; i < g_actor_count; i++) {
        if (g_actor_active[i] && !g_actor_hidden[i] && !g_actor_collisions_disabled[i]) {
            act_l = g_actor_x[i] + g_actor_bbox_left[i];
            act_r = g_actor_x[i] + g_actor_bbox_right[i];
            act_t = g_actor_y[i] + g_actor_bbox_top[i];
            act_b = g_actor_y[i] + g_actor_bbox_bottom[i];

            if (x_right >= act_l && x_left <= act_r && y_bottom >= act_t && y_top <= act_b) {
                return 1;
            }
        }
    }

    return 0;
}

int collision_check_actor(int id, int x, int y) {
    int x_left, x_right, y_top, y_bottom;
    int tx_start, tx_end, ty_start, ty_end, tx, ty;
    int i, other_l, other_r, other_t, other_b;

    if (id < 0 || id >= PCE_MAX_ACTORS) return 1;

    x_left = x + g_actor_bbox_left[id];
    x_right = x + g_actor_bbox_right[id];
    y_top = y + g_actor_bbox_top[id];
    y_bottom = y + g_actor_bbox_bottom[id];

    /* 1. Scene boundaries */
    if (x_left < 0 || y_top < 0 || (x_right >> 3) >= g_collision_width || (y_bottom >> 3) >= g_collision_height) {
        return 1;
    }

    /* 2. Tile map collisions */
    tx_start = x_left >> 3;
    tx_end = x_right >> 3;
    ty_start = y_top >> 3;
    ty_end = y_bottom >> 3;

    for (ty = ty_start; ty <= ty_end; ty++) {
        for (tx = tx_start; tx <= tx_end; tx++) {
            if (collision_check_tile(tx, ty) != COLLISION_NONE) {
                return 1;
            }
        }
    }

    /* 3. Collisions with other solid actors & player */
    for (i = 0; i < g_actor_count; i++) {
        if (i == id) continue;
        if (i == 0) {
            other_l = g_actor_x[0] + g_player_bbox_left;
            other_r = g_actor_x[0] + g_player_bbox_right;
            other_t = g_actor_y[0] + g_player_bbox_top;
            other_b = g_actor_y[0] + g_player_bbox_bottom;
            if (x_right >= other_l && x_left <= other_r && y_bottom >= other_t && y_top <= other_b) {
                return 1;
            }
        } else {
            if (g_actor_active[i] && !g_actor_hidden[i] && !g_actor_collisions_disabled[i]) {
                other_l = g_actor_x[i] + g_actor_bbox_left[i];
                other_r = g_actor_x[i] + g_actor_bbox_right[i];
                other_t = g_actor_y[i] + g_actor_bbox_top[i];
                other_b = g_actor_y[i] + g_actor_bbox_bottom[i];

                if (x_right >= other_l && x_left <= other_r && y_bottom >= other_t && y_top <= other_b) {
                    return 1;
                }
            }
        }
    }

    return 0;
}
