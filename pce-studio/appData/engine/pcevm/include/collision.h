#ifndef PCE_COLLISION_H
#define PCE_COLLISION_H

#define COLLISION_NONE 0
#define COLLISION_SOLID 1

extern int g_collision_width;
extern int g_collision_height;
extern int g_player_bbox_left;
extern int g_player_bbox_right;
extern int g_player_bbox_top;
extern int g_player_bbox_bottom;

int collision_check_tile(int tile_x, int tile_y);
int collision_check_point(int px, int py);
int collision_check_box(int x, int y);

#endif /* PCE_COLLISION_H */
