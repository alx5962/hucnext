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
    x_left = x + g_player_bbox_left;
    x_right = x + g_player_bbox_right;
    y_top = y + g_player_bbox_top;
    y_bottom = y + g_player_bbox_bottom;

    if (collision_check_point(x_left, y_top) != COLLISION_NONE) return 1;
    if (collision_check_point(x_right, y_top) != COLLISION_NONE) return 1;
    if (collision_check_point(x_left, y_bottom) != COLLISION_NONE) return 1;
    if (collision_check_point(x_right, y_bottom) != COLLISION_NONE) return 1;
    return 0;
}
