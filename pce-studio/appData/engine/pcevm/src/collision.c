#define PCE_COLLISION_C 1
#include "include/collision.h"

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
    if (collision_check_point(x + 2, y + 8) != COLLISION_NONE) return 1;
    if (collision_check_point(x + 13, y + 8) != COLLISION_NONE) return 1;
    if (collision_check_point(x + 2, y + 15) != COLLISION_NONE) return 1;
    if (collision_check_point(x + 13, y + 15) != COLLISION_NONE) return 1;
    return 0;
}
