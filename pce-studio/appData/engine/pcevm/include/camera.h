#ifndef PCE_CAMERA_H
#define PCE_CAMERA_H

#include "include/pce_system.h"

void camera_init(void);
void camera_set_bounds(int width_tiles, int height_tiles);
void camera_update(int target_x, int target_y);
void camera_update_x(int target_x);
void camera_apply(void);
void camera_shake(int frames, int magnitude);

void camera_reset_parallax(void);
void camera_set_parallax_layer(int layer_idx, int top_line, int bottom_line, int speed);
void camera_set_parallax_count(int count);

#endif /* PCE_CAMERA_H */

