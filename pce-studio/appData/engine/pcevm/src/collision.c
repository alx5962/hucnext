#define PCE_COLLISION_C 1
#include "include/collision.h"
#include "include/actor.h"

int g_collision_width = 32;
int g_collision_height = 28;

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
    int x_left, x_right;
    int y_top, y_bottom;

    if (g_actor_size[0] == SZ_32x32 || g_actor_size[0] == SZ_32x16 || g_actor_size[0] == SZ_32x64) {
        x_left = x + 4;
        x_right = x + 27;
    } else {
        x_left = x + 2;
        x_right = x + 13;
    }

    if (g_actor_size[0] == SZ_32x64 || g_actor_size[0] == SZ_16x64) {
        y_top = y + 48;
        y_bottom = y + 63;
    } else if (g_actor_size[0] == SZ_32x32 || g_actor_size[0] == SZ_16x32) {
        y_top = y + 16;
        y_bottom = y + 31;
    } else {
        y_top = y + 8;
        y_bottom = y + 15;
    }

    if (collision_check_point(x_left, y_top) != COLLISION_NONE) return 1;
    if (collision_check_point(x_right, y_top) != COLLISION_NONE) return 1;
    if (collision_check_point(x_left, y_bottom) != COLLISION_NONE) return 1;
    if (collision_check_point(x_right, y_bottom) != COLLISION_NONE) return 1;
    return 0;
}
