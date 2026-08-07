#ifndef PCE_ACTOR_H
#define PCE_ACTOR_H

#ifndef PCE_MAX_ACTORS
#define PCE_MAX_ACTORS 32
#endif

#ifndef SZ_16x16
#define SZ_16x16 0x00
#endif

#ifndef SZ_16x32
#define SZ_16x32 0x10
#endif

#ifndef SZ_32x16
#define SZ_32x16 0x01
#endif

#ifndef SZ_32x32
#define SZ_32x32 0x11
#endif

#ifndef PCE_ACTOR_C
extern int g_actor_active[];
extern int g_actor_x[];
extern int g_actor_y[];
extern int g_actor_tile_id[];
extern int g_actor_palette[];
extern unsigned char g_actor_size[];
extern int g_actor_dir[];
extern int g_actor_anim_frame[];
extern int g_actor_sprite_handle[];
extern int g_actor_count;
#endif

void actor_init(void);
int actor_spawn(int x, int y, int tile_id, int palette, int size);
void actor_update_all(void);
void actor_set_pos(int id, int x, int y);
void actor_set_dir(int id, int dir);

#endif
