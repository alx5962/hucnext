#define PCE_PROJECTILE_C 1
#include "include/projectile.h"
#include "include/engine.h"

void projectile_init(void) {
  int i;
  for (i = 0; i < PROJ_MAX_COUNT; i++) {
    g_proj_active[i] = 0;
    g_proj_x[i] = 0;
    g_proj_y[i] = 0;
    g_proj_vx[i] = 0;
    g_proj_vy[i] = 0;
    g_proj_life[i] = 0;
    g_proj_owner[i] = 0;
    g_proj_tile_id[i] = PROJ_VRAM_ADDR;
    g_proj_palette[i] = PROJ_PALETTE;
    g_proj_size[i] = SZ_16x16;
    g_proj_destroy_on_hit[i] = 1;

    spr_set(PROJ_SPRITE_START + i);
    spr_x(512);
    spr_y(512);
    spr_hide();
  }
  g_proj_rate_timer = 0;
}

int projectile_launch(int x, int y, int vx, int vy, int life, int owner, int tile_id, int pal, int size) {
  int i, slot;
  slot = -1;
  for (i = 0; i < PROJ_MAX_COUNT; i++) {
    if (!g_proj_active[i]) {
      slot = i;
      break;
    }
  }
  if (slot < 0) {
    return -1;
  }

  g_proj_active[slot] = 1;
  g_proj_x[slot] = x;
  g_proj_y[slot] = y;
  g_proj_vx[slot] = vx;
  g_proj_vy[slot] = vy;
  g_proj_life[slot] = (life > 0) ? life : 60;
  g_proj_owner[slot] = owner;
  g_proj_tile_id[slot] = (tile_id > 0) ? tile_id : PROJ_VRAM_ADDR;
  g_proj_palette[slot] = (pal >= 0) ? pal : PROJ_PALETTE;
  g_proj_size[slot] = size;
  g_proj_destroy_on_hit[slot] = 1;

  return slot;
}

void projectile_update_all(void) {
  int i, a, px, py, pw, ph, ax, ay, aw, ah;
  int hit;

  if (g_proj_rate_timer > 0) {
    g_proj_rate_timer--;
  }

  for (i = 0; i < PROJ_MAX_COUNT; i++) {
    if (!g_proj_active[i])
      continue;

    g_proj_x[i] += g_proj_vx[i];
    g_proj_y[i] += g_proj_vy[i];

    if (g_proj_life[i] > 0) {
      g_proj_life[i]--;
      if (g_proj_life[i] == 0) {
        g_proj_active[i] = 0;
        continue;
      }
    }

    px = g_proj_x[i];
    py = g_proj_y[i];

    /* Screen bound check relative to camera */
    if (px < g_cam_x - 32 || px > g_cam_x + 288 || py < -32 || py > 256) {
      g_proj_active[i] = 0;
      continue;
    }

    /* Collision check */
    hit = 0;
    pw = 8;
    ph = 8;

    if (g_proj_owner[i] == 0) {
      /* Player projectile: check against active enemy actors */
      for (a = 1; a < g_actor_count; a++) {
        if (g_actor_active[a] && !g_actor_hidden[a] && !g_actor_collisions_disabled[a] && actor_is_in_bounds(a)) {
          ax = g_actor_x[a];
          ay = g_actor_y[a];
          aw = 16;
          ah = 16;
          if (px + pw > ax && px < ax + aw && py + ph > ay && py < ay + ah) {
            hit = 1;
            actor_hide(a);
            actor_deactivate(a);
            break;
          }
        }
      }
    } else {
      /* Enemy projectile: check against player (actor 0) */
      if (g_actor_count > 0 && g_actor_active[0] && !g_actor_hidden[0]) {
        ax = g_actor_x[0];
        ay = g_actor_y[0];
        aw = 16;
        ah = 16;
        if (px + pw > ax && px < ax + aw && py + ph > ay && py < ay + ah) {
          hit = 1;
          camera_shake(15, 5);
        }
      }
    }

    if (hit && g_proj_destroy_on_hit[i]) {
      g_proj_active[i] = 0;
    }
  }
}

void projectile_render_all(void) {
  int i, screen_x, screen_y;

  for (i = 0; i < PROJ_MAX_COUNT; i++) {
    spr_set(PROJ_SPRITE_START + i);
    if (!g_proj_active[i] || g_current_scene_type == SCENE_TYPE_LOGO) {
      spr_x(512);
      spr_y(512);
      spr_hide();
      continue;
    }

    screen_x = g_proj_x[i] - g_cam_x;
    screen_y = g_proj_y[i] - g_cam_y;

    if (screen_x < -16 || screen_x > 256 || screen_y < -16 || screen_y > 224) {
      spr_x(512);
      spr_y(512);
      spr_hide();
    } else {
      spr_x(screen_x);
      spr_y(screen_y);
      spr_pattern(g_proj_tile_id[i]);
      spr_pal(g_proj_palette[i]);
      spr_pri(1);
      spr_ctrl(FLIP_MAS | SIZE_MAS, g_proj_size[i] | NO_FLIP);
    }
  }
}
