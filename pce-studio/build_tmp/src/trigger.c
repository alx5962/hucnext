#include "include/trigger.h"
#include "include/vm.h"
#include "include/actor.h"

pce_trigger_t g_triggers[MAX_TRIGGERS];
int g_trigger_count;
extern int g_current_scene;
void load_scene(int scene_num, int player_x, int player_y);

void trigger_init(void) {
    g_trigger_count = 0;
}

void trigger_add(int scene_id, int x, int y, int w, int h, int target_scene, int target_x, int target_y, unsigned char* script) {
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
    for (i = 0; i < g_trigger_count; i++) {
        if (g_triggers[i].scene_id != g_current_scene) {
            continue;
        }

        tx1 = g_triggers[i].x << 3;
        ty1 = g_triggers[i].y << 3;
        tx2 = tx1 + (g_triggers[i].w << 3);
        ty2 = ty1 + (g_triggers[i].h << 3);

        if ((px + 4) >= tx1 && (px + 4) < tx2 && (py + 8) >= ty1 && (py + 8) < ty2) {
            if (g_triggers[i].target_scene > 0) {
                load_scene(g_triggers[i].target_scene, g_triggers[i].target_x, g_triggers[i].target_y);
                break;
            } else if (g_triggers[i].target_x >= 0 && g_triggers[i].target_y >= 0) {
                actor_set_pos(0, g_triggers[i].target_x, g_triggers[i].target_y);
                break;
            }
            if (g_triggers[i].script) {
                vm_start_script(g_triggers[i].script);
                break;
            }
        }
    }
}
