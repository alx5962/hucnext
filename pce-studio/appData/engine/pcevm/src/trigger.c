#define PCE_TRIGGER_C 1
#include "include/trigger.h"
#include "include/actor.h"
#include "include/vm.h"

static unsigned char g_trigger_cooldown = 0;
void load_scene(int scene_num, int player_x, int player_y);
void scene_transition(int scene_num, int player_x, int player_y, int speed);
int interact_trigger(int scene_num, int trigger_num);
int interact_trigger_leave(int scene_num, int trigger_num);

void trigger_init(void) {
  g_trigger_count = 0;
  g_active_trigger_count = 0;
  g_trigger_cooldown = 0;
  g_inside_trigger = 0;
  g_current_trigger_hit = -1;
}

void trigger_activate_scene(int scene_id) {
  int i;
  g_active_trigger_count = 0;
#ifdef HAS_TRIGGER_TABLE
  for (i = 0; i < TRIGGER_COUNT; i++) {
    if (TRIG_SCENE(i) == scene_id) {
      if (g_active_trigger_count < MAX_SCENE_TRIGGERS) {
        g_active_trigger_indices[g_active_trigger_count] = i;
        g_active_trigger_count++;
      }
    }
  }
#endif
}

void trigger_load_all(void) {
  /* No-op: trigger data is read directly from g_trigger_table in ROM */
}

void trigger_check(int px, int py) {
  int t, i, tx1, ty1, tx2, ty2;
  int hit_trigger;
  int last_trigger;
  int target_sc, target_px, target_py;

  hit_trigger = -1;

  if (g_trigger_cooldown > 0) {
    g_trigger_cooldown--;
  }

  for (t = 0; t < g_active_trigger_count; t++) {
    i = g_active_trigger_indices[t];

    tx1 = TRIG_X(i);
    ty1 = TRIG_Y(i);
    tx2 = tx1 + TRIG_W(i);
    ty2 = ty1 + TRIG_H(i);

    if ((px + 12) >= tx1 && (px + 2) < tx2 &&
        (py + (g_actor_size[0] == SZ_16x32 ? 28 : 12)) >= ty1 &&
        (py + 4) < ty2) {
      hit_trigger = i;
      break;
    }
  }

  last_trigger = g_current_trigger_hit;

  if (last_trigger >= 0 && last_trigger != hit_trigger) {
    interact_trigger_leave(g_current_scene, last_trigger);
  }

  if (hit_trigger >= 0) {
    /* Entering or inside trigger: disable input scripts and ensure clean sprite state */
    if (g_inside_trigger == 0) {
      if (g_actor_state[0] > 0) {
        player_set_state(0, 0);
      }
    }
    g_inside_trigger = 1;
    g_current_trigger_hit = hit_trigger;

    if (last_trigger != hit_trigger) {
      g_trigger_cooldown = 20;
      target_sc = TRIG_TARGET_SCENE(hit_trigger);
      target_px = TRIG_TARGET_X(hit_trigger);
      target_py = TRIG_TARGET_Y(hit_trigger);

      if (target_sc > 0) {
        g_inside_trigger = 0;
        g_current_trigger_hit = -1;
        scene_transition(target_sc, target_px, target_py, 2);
        return;
      } else if (target_px >= 0 && target_py >= 0) {
        actor_set_pos(0, target_px, target_py);
        return;
      } else if (interact_trigger(g_current_scene, hit_trigger)) {
        return;
      }
    }
  } else {
    /* Outside trigger: reactivate input scripts */
    g_inside_trigger = 0;
    g_current_trigger_hit = -1;
  }
}

int trigger_find_at(int px, int py) {
  int t, i, tx1, ty1, tx2, ty2;
  int cx, cy;
  cx = px + 4;
  cy = py + 4;
  for (t = 0; t < g_active_trigger_count; t++) {
    i = g_active_trigger_indices[t];

    tx1 = TRIG_X(i);
    ty1 = TRIG_Y(i);
    tx2 = tx1 + TRIG_W(i);
    ty2 = ty1 + TRIG_H(i);

    if (cx >= tx1 && cx < tx2 && cy >= ty1 && cy < ty2) {
      return i;
    }
  }
  return -1;
}

