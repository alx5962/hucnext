#ifndef PCE_CAMERA_H
#define PCE_CAMERA_H

#include "include/pce_system.h"

#ifndef PCE_CAMERA_C
extern int g_cam_x;
extern int g_cam_y;
#endif

void camera_init(void);
void camera_update(int target_x, int target_y);
void camera_update_x(int target_x);
void camera_apply(void);

#endif /* PCE_CAMERA_H */
