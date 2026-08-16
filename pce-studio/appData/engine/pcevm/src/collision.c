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
    int y_top, y_bottom;
    if (g_actor_size[0] == SZ_16x32) {
        y_top = y + 16;
        y_bottom = y + 23;
    } else {
        y_top = y + 8;
        y_bottom = y + 15;
    }
    if (collision_check_point(x + 2, y_top) != COLLISION_NONE) return 1;
    if (collision_check_point(x + 13, y_top) != COLLISION_NONE) return 1;
    if (collision_check_point(x + 2, y_bottom) != COLLISION_NONE) return 1;
    if (collision_check_point(x + 13, y_bottom) != COLLISION_NONE) return 1;
    return 0;
}
