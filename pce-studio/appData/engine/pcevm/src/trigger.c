#define PCE_TRIGGER_C 1
#include "include/trigger.h"
#include "include/actor.h"
#include "include/vm.h"

static unsigned char g_trigger_cooldown = 0;
void load_scene(int scene_num, int player_x, int player_y);
int interact_trigger(int scene_num, int trigger_num);

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
  for (i = 0; i < g_trigger_count; i++) {
    if (g_triggers[i].scene_id == scene_id) {
      if (g_active_trigger_count < 32) {
        g_active_trigger_indices[g_active_trigger_count] = i;
        g_active_trigger_count++;
      }
    }
  }
}

void trigger_load_all(void) {
#ifdef HAS_TRIGGER_TABLE
  int i;
  for (i = 0; i < TRIGGER_COUNT; i++) {
    trigger_add(g_trigger_table[i * 8 + 0], g_trigger_table[i * 8 + 1],
                g_trigger_table[i * 8 + 2], g_trigger_table[i * 8 + 3],
                g_trigger_table[i * 8 + 4], g_trigger_table[i * 8 + 5],
                g_trigger_table[i * 8 + 6], g_trigger_table[i * 8 + 7],
                (void *)0);
  }
#endif
}

void trigger_add(int scene_id, int x, int y, int w, int h, int target_scene,
                 int target_x, int target_y, unsigned char *script) {
  if (g_trigger_count < MAX_TRIGGERS) {
    g_triggers[g_trigger_count].scene_id = scene_id;
    g_triggers[g_trigger_count].x = x;
    g_triggers[g_trigger_count].y = y;
    g_triggers[g_trigger_count].w = w;
    g_triggers[g_trigger_count].h = h;
    g_triggers[g_trigger_count].target_scene = target_scene;
    g_triggers[g_trigger_count].target_x = target_x;
    g_triggers[g_trigger_count].target_y = target_y;
    g_triggers[g_trigger_count].script = script;
    g_trigger_count++;
  }
}

void trigger_check(int px, int py) {
  int t, i, tx1, ty1, tx2, ty2;
  int hit_trigger;

  hit_trigger = -1;

  if (g_trigger_cooldown > 0) {
    g_trigger_cooldown--;
  }

  for (t = 0; t < g_active_trigger_count; t++) {
    i = g_active_trigger_indices[t];

    tx1 = g_triggers[i].x;
    ty1 = g_triggers[i].y;
    tx2 = tx1 + g_triggers[i].w;
    ty2 = ty1 + g_triggers[i].h;

    if ((px + 12) >= tx1 && (px + 2) < tx2 &&
        (py + (g_actor_size[0] == SZ_16x32 ? 28 : 12)) >= ty1 &&
        (py + 4) < ty2) {
      hit_trigger = i;
      break;
    }
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

    if (g_trigger_cooldown == 0) {
      if (g_triggers[hit_trigger].target_scene > 0) {
        g_trigger_cooldown = 20;
        g_inside_trigger = 0;
        g_current_trigger_hit = -1;
        load_scene(g_triggers[hit_trigger].target_scene,
                   g_triggers[hit_trigger].target_x,
                   g_triggers[hit_trigger].target_y);
        return;
      } else if (g_triggers[hit_trigger].target_x >= 0 && g_triggers[hit_trigger].target_y >= 0) {
        g_trigger_cooldown = 20;
        actor_set_pos(0, g_triggers[hit_trigger].target_x, g_triggers[hit_trigger].target_y);
        return;
      } else if (interact_trigger(g_current_scene, hit_trigger)) {
        g_trigger_cooldown = 20;
        return;
      }
      if (g_triggers[hit_trigger].script) {
        g_trigger_cooldown = 20;
        vm_start_script(g_triggers[hit_trigger].script);
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

    tx1 = g_triggers[i].x;
    ty1 = g_triggers[i].y;
    tx2 = tx1 + g_triggers[i].w;
    ty2 = ty1 + g_triggers[i].h;

    if (cx >= tx1 && cx < tx2 && cy >= ty1 && cy < ty2) {
      return i;
    }
  }
  return -1;
}

