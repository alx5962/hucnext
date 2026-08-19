#ifndef PCE_COLLISION_H
#define PCE_COLLISION_H

#define COLLISION_NONE 0
#define COLLISION_SOLID 1

int collision_check_tile(int tile_x, int tile_y);
int collision_check_point(int px, int py);
int collision_check_box(int x, int y);

#endif /* PCE_COLLISION_H */
