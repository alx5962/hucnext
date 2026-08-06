#include "include/camera.h"

int g_cam_x;
int g_cam_y;

#define CAM_MAX_X  ((32 * 8) - PCE_SCREEN_WIDTH_PX)
#define CAM_MAX_Y  ((28 * 8) - PCE_SCREEN_HEIGHT_PX)

void camera_init(void) {
    g_cam_x = 0;
    g_cam_y = 0;
}

void camera_update(int target_x, int target_y) {
    g_cam_x = target_x - (PCE_SCREEN_WIDTH_PX / 2);
    g_cam_y = target_y - (PCE_SCREEN_HEIGHT_PX / 2);
    if (g_cam_x < 0) g_cam_x = 0;
    if (g_cam_y < 0) g_cam_y = 0;
    if (g_cam_x > CAM_MAX_X) g_cam_x = CAM_MAX_X;
    if (g_cam_y > CAM_MAX_Y) g_cam_y = CAM_MAX_Y;
}

void camera_update_x(int target_x) {
    g_cam_x = target_x - (PCE_SCREEN_WIDTH_PX / 2);
    if (g_cam_x < 0) g_cam_x = 0;
    if (g_cam_x > CAM_MAX_X) g_cam_x = CAM_MAX_X;
}

void camera_apply(void) {
    scroll(0, g_cam_x, g_cam_y, 0, 223, 0xC0);
}
