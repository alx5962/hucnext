#define PCE_TRIGGER_C 1
#include "include/trigger.h"
#include "include/actor.h"
#include "include/vm.h"

static unsigned char g_trigger_cooldown = 0;
void load_scene(int scene_num, int player_x, int player_y);
int interact_trigger(int scene_num, int trigger_num);

void trigger_init(void) {
  g_trigger_count = 0;
  g_trigger_cooldown = 0;
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
  int i, tx1, ty1, tx2, ty2;

  if (g_trigger_cooldown > 0) {
    g_trigger_cooldown--;
    return;
  }

  for (i = 0; i < g_trigger_count; i++) {
    if (g_triggers[i].scene_id != g_current_scene) {
      continue;
    }

    tx1 = g_triggers[i].x;
    ty1 = g_triggers[i].y;
    tx2 = tx1 + g_triggers[i].w;
    ty2 = ty1 + g_triggers[i].h;

    if ((px + 12) >= tx1 && (px + 2) < tx2 &&
        (py + (g_actor_size[0] == SZ_16x32 ? 28 : 12)) >= ty1 &&
        (py + 4) < ty2) {
      if (g_triggers[i].target_scene > 0) {
        g_trigger_cooldown = 20;
        load_scene(g_triggers[i].target_scene, g_triggers[i].target_x,
                   g_triggers[i].target_y);
        break;
      } else if (g_triggers[i].target_x >= 0 && g_triggers[i].target_y >= 0) {
        g_trigger_cooldown = 20;
        actor_set_pos(0, g_triggers[i].target_x, g_triggers[i].target_y);
        break;
      } else if (interact_trigger(g_current_scene, i)) {
        g_trigger_cooldown = 20;
        break;
      }
      if (g_triggers[i].script) {
        g_trigger_cooldown = 20;
        vm_start_script(g_triggers[i].script);
        break;
      }
    }
  }
}

int trigger_find_at(int px, int py) {
  int i, tx1, ty1, tx2, ty2;
  int cx, cy;
  cx = px + 4;
  cy = py + 4;
  for (i = 0; i < g_trigger_count; i++) {
    if (g_triggers[i].scene_id != g_current_scene) {
      continue;
    }
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

