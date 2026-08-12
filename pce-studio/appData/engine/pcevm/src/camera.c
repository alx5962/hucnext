#define PCE_CAMERA_C 1
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

int g_camera_shake_timer = 0;
int g_camera_shake_mag = 0;

void camera_shake(int frames, int magnitude) {
    g_camera_shake_timer = frames;
    g_camera_shake_mag = magnitude;
}

void camera_apply(void) {
    int sx;
    int sy;
    sx = g_cam_x;
    sy = g_cam_y;
    if (g_camera_shake_timer > 0) {
        g_camera_shake_timer--;
        if (g_camera_shake_mag > 0) {
            sx += (rand() % (g_camera_shake_mag * 2 + 1)) - g_camera_shake_mag;
            sy += (rand() % (g_camera_shake_mag * 2 + 1)) - g_camera_shake_mag;
            if (sx < 0) sx = 0;
            if (sy < 0) sy = 0;
        }
    }
    scroll(0, sx, sy, 0, 223, 0xC0);
}
