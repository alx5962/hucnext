#ifndef PCE_SYSTEM_H
#define PCE_SYSTEM_H

#include <huc.h>

#define PCE_SCREEN_WIDTH_TILES  32
#define PCE_SCREEN_HEIGHT_TILES 28
#define PCE_SCREEN_WIDTH_PX     256
#define PCE_SCREEN_HEIGHT_PX    224

#define PCE_MAX_ACTORS 32
#define PCE_MAX_SPRITES 64

void pce_sys_init(void);
void pce_sys_vsync(void);
unsigned int pce_sys_read_joy(int index);

#endif /* PCE_SYSTEM_H */
