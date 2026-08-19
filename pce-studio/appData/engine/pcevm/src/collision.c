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
    int i, act_l, act_r, act_t, act_b;
    x_left = x + g_player_bbox_left;
    x_right = x + g_player_bbox_right;
    y_top = y + g_player_bbox_top;
    y_bottom = y + g_player_bbox_bottom;

    /* Tile map collisions */
    if (collision_check_point(x_left, y_top) != COLLISION_NONE) return 1;
    if (collision_check_point(x_right, y_top) != COLLISION_NONE) return 1;
    if (collision_check_point(x_left, y_bottom) != COLLISION_NONE) return 1;
    if (collision_check_point(x_right, y_bottom) != COLLISION_NONE) return 1;

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
