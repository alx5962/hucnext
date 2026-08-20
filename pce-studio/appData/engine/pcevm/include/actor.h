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

#ifndef SZ_16x64
#define SZ_16x64 0x30
#endif

#ifndef SZ_32x16
#define SZ_32x16 0x01
#endif

#ifndef SZ_32x32
#define SZ_32x32 0x11
#endif

#ifndef SZ_32x64
#define SZ_32x64 0x31
#endif

#ifndef DIR_RIGHT
#define DIR_RIGHT 0
#endif
#ifndef DIR_LEFT
#define DIR_LEFT  1
#endif
#ifndef DIR_UP
#define DIR_UP    2
#endif
#ifndef DIR_DOWN
#define DIR_DOWN  3
#endif

void actor_init(void);
int actor_spawn(int x, int y, int tile_id, int palette, int size);
void actor_update_all(void);
void actor_set_pos(int id, int x, int y);
void actor_set_dir(int id, int dir);
void actor_hide(int id);
void actor_show(int id);
void actor_set_hidden(int id, int hidden);
void actor_activate(int id);
void actor_deactivate(int id);
void actor_set_collisions(int id, int enable);
void actor_set_pos_rel(int id, int dx, int dy);
void actor_move_to(int id, int target_x, int target_y);
void actor_set_move_speed(int id, int speed);
void actor_set_anim_speed(int id, int speed);
void actor_set_frame(int id, int frame);
void actor_emote(int id, int emote_id);
void actor_push(int id, int dir, int slide);
void actor_effects(int id, int effect_id);
void actor_hide_all(void);

#endif
