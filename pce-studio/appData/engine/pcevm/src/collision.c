#include "include/collision.h"

unsigned char *g_collision_map;
int g_collision_width;
int g_collision_height;

void collision_init(unsigned char* map, int w, int h) {
    g_collision_map = map;
    g_collision_width = w;
    g_collision_height = h;
}

int collision_check_tile(int tile_x, int tile_y) {
    if (!g_collision_map) return COLLISION_NONE;
    if (tile_x < 0 || tile_x >= g_collision_width || tile_y < 0 || tile_y >= g_collision_height) {
        return COLLISION_SOLID;
    }
    return g_collision_map[tile_y * g_collision_width + tile_x];
}

int collision_check_point(int px, int py) {
    return collision_check_tile(px >> 3, py >> 3);
}
