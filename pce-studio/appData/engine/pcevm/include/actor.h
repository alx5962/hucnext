#ifndef PCE_ACTOR_H
#define PCE_ACTOR_H

#include "include/pce_system.h"

typedef struct {
    int x;
    int y;
    int tile_id;
    int palette;
    int active;
    int dir;
    int anim_frame;
    int sprite_handle;
} pce_actor_t;

extern pce_actor_t g_actors[PCE_MAX_ACTORS];
extern int g_actor_count;

void actor_init(void);
int actor_spawn(int x, int y, int tile_id, int palette);
void actor_update_all(void);
void actor_set_pos(int id, int x, int y);
void actor_set_dir(int id, int dir);

#endif /* PCE_ACTOR_H */
