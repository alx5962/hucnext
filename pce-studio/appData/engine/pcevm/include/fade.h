/*
 * PCE Studio Engine - Screen Fade Management
 * Hardware palette fading for PC Engine (VCE)
 */

#ifndef FADE_H
#define FADE_H

#define FADE_DIR_NONE 0
#define FADE_DIR_IN   1
#define FADE_DIR_OUT  2

#define PCE_PALETTE_TOTAL_COLORS 512

/* Reference palette backup in RAM (512 16-bit 9-bit RGB words = 1024 bytes) */
int g_scene_palette[PCE_PALETTE_TOTAL_COLORS];

/* Current fade step: 0 = full brightness, 7 = black */
int g_fade_step = 0;

/* Fade direction: FADE_DIR_NONE, FADE_DIR_IN, FADE_DIR_OUT */
int g_fade_dir = 0;

/* Countdown timer and step delay */
int g_fade_timer = 0;
int g_fade_delay = 0;

/* Flag indicating an active fade is in progress (scripts pause while this is 1) */
int g_fade_active = 0;

/* Function declarations */
void fade_init(void);
void fade_backup_palette(void);
void fade_apply(int step);
void fade_in(int speed);
void fade_out(int speed);
void fade_update(void);
int fade_speed_to_delay(int speed);

#endif
