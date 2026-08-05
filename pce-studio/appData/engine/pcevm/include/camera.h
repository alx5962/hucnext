#ifndef PCE_CAMERA_H
#define PCE_CAMERA_H

#include "include/pce_system.h"

extern int g_cam_x;
extern int g_cam_y;

void camera_init(void);
void camera_update(int target_x, int target_y);
void camera_apply(void);

#endif /* PCE_CAMERA_H */
