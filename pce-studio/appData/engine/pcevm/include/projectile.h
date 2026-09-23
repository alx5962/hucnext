#ifndef PCE_PROJECTILE_H
#define PCE_PROJECTILE_H

#include <huc.h>
#include "include/actor.h"

#ifndef PROJ_MAX_COUNT
#define PROJ_MAX_COUNT 8
#endif

#ifndef PROJ_SPRITE_START
#define PROJ_SPRITE_START 56
#endif

#ifndef PROJ_VRAM_ADDR
#define PROJ_VRAM_ADDR 0x7C00
#endif

#ifndef PROJ_PALETTE
#define PROJ_PALETTE 15
#endif

int g_proj_active[PROJ_MAX_COUNT];
int g_proj_x[PROJ_MAX_COUNT];
int g_proj_y[PROJ_MAX_COUNT];
int g_proj_vx[PROJ_MAX_COUNT];
int g_proj_vy[PROJ_MAX_COUNT];
int g_proj_life[PROJ_MAX_COUNT];
int g_proj_owner[PROJ_MAX_COUNT];
int g_proj_tile_id[PROJ_MAX_COUNT];
int g_proj_palette[PROJ_MAX_COUNT];
int g_proj_size[PROJ_MAX_COUNT];
int g_proj_destroy_on_hit[PROJ_MAX_COUNT];

int g_proj_rate_timer;

void projectile_init(void);
int projectile_launch(int x, int y, int vx, int vy, int life, int owner, int tile_id, int pal, int size);
void projectile_update_all(void);
void projectile_render_all(void);

#endif /* PCE_PROJECTILE_H */
