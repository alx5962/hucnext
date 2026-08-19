#ifndef PCE_SYSTEM_H
#define PCE_SYSTEM_H

#define PCE_SCREEN_WIDTH_TILES  32
#define PCE_SCREEN_HEIGHT_TILES 28
#define PCE_SCREEN_WIDTH_PX     256
#define PCE_SCREEN_HEIGHT_PX    224

#define PCE_MAX_ACTORS 32
#define PCE_MAX_SPRITES 64

/* PC Engine Joypad button bitmasks */
#ifndef JOY_I
#define JOY_I       0x01
#endif
#ifndef JOY_A
#define JOY_A       0x01
#endif
#ifndef JOY_II
#define JOY_II      0x02
#endif
#ifndef JOY_B
#define JOY_B       0x02
#endif
#ifndef JOY_SEL
#define JOY_SEL     0x04
#endif
#ifndef JOY_SLCT
#define JOY_SLCT    0x04
#endif
#ifndef JOY_RUN
#define JOY_RUN     0x08
#endif
#ifndef JOY_STRT
#define JOY_STRT    0x08
#endif
#ifndef JOY_UP
#define JOY_UP      0x10
#endif
#ifndef JOY_RIGHT
#define JOY_RIGHT   0x20
#endif
#ifndef JOY_RGHT
#define JOY_RGHT    0x20
#endif
#ifndef JOY_DOWN
#define JOY_DOWN    0x40
#endif
#ifndef JOY_LEFT
#define JOY_LEFT    0x80
#endif

void pce_sys_init(void);
void pce_sys_vsync(void);
unsigned int pce_sys_read_joy(int index);

#endif /* PCE_SYSTEM_H */
