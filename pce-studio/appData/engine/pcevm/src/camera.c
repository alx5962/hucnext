#define PCE_CAMERA_C 1
#include "include/camera.h"

void camera_reset_parallax(void) {
    int i;
    g_parallax_count = 0;
    for (i = 1; i < 4; i++) {
        scroll_disable(i);
    }
}

void camera_set_parallax_layer(int layer_idx, int top_line, int bottom_line, int speed) {
    if (layer_idx >= 0 && layer_idx < 4) {
        g_parallax_top[layer_idx] = top_line;
        g_parallax_bottom[layer_idx] = bottom_line;
        g_parallax_speed[layer_idx] = speed;
    }
}

void camera_set_parallax_count(int count) {
    int i;
    g_parallax_count = count;
    for (i = count; i < 4; i++) {
        scroll_disable(i);
    }
}

void camera_init(void) {
    g_cam_x = 0;
    g_cam_y = 0;
    g_cam_max_x = 0;
    g_cam_max_y = 0;
    camera_reset_parallax();
}

void camera_set_bounds(int width_tiles, int height_tiles) {
    int max_x;
    int max_y;
    max_x = (width_tiles * 8) - PCE_SCREEN_WIDTH_PX;
    max_y = (height_tiles * 8) - PCE_SCREEN_HEIGHT_PX;
    if (max_x > 0) g_cam_max_x = max_x;
    else g_cam_max_x = 0;
    if (max_y > 0) g_cam_max_y = max_y;
    else g_cam_max_y = 0;
}

void camera_update(int target_x, int target_y) {
    g_cam_x = target_x - (PCE_SCREEN_WIDTH_PX / 2);
    g_cam_y = target_y - (PCE_SCREEN_HEIGHT_PX / 2);
    if (g_cam_x < 0) g_cam_x = 0;
    if (g_cam_y < 0) g_cam_y = 0;
    if (g_cam_x > g_cam_max_x) g_cam_x = g_cam_max_x;
    if (g_cam_y > g_cam_max_y) g_cam_y = g_cam_max_y;
}

void camera_update_x(int target_x) {
    g_cam_x = target_x - (PCE_SCREEN_WIDTH_PX / 2);
    if (g_cam_x < 0) g_cam_x = 0;
    if (g_cam_x > g_cam_max_x) g_cam_x = g_cam_max_x;
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
    int i;
    int lx;
    int ly;
    int spd;
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
    if (g_parallax_count <= 0) {
        scroll(0, sx, sy, 0, 223, 0xC0);
    } else {
        for (i = 0; i < g_parallax_count; i++) {
            spd = g_parallax_speed[i];
            if (spd == 0) {
                lx = sx;
            } else if (spd == 128 || spd < 0) {
                lx = 0;
            } else {
                lx = sx >> spd;
            }
            ly = sy + g_parallax_top[i];
            scroll(i, lx, ly, g_parallax_top[i], g_parallax_bottom[i], 0xC0);
        }
    }
}
