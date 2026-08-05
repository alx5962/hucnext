#include "include/trigger.h"
#include "include/vm.h"

pce_trigger_t g_triggers[MAX_TRIGGERS];
int g_trigger_count;

void trigger_init(void) {
    g_trigger_count = 0;
}

void trigger_add(int x, int y, int w, int h, unsigned char* script) {
    if (g_trigger_count < MAX_TRIGGERS) {
        g_triggers[g_trigger_count].x = x;
        g_triggers[g_trigger_count].y = y;
        g_triggers[g_trigger_count].w = w;
        g_triggers[g_trigger_count].h = h;
        g_triggers[g_trigger_count].script = script;
        g_trigger_count++;
    }
}

void trigger_check(int px, int py) {
    int i;
    for (i = 0; i < g_trigger_count; i++) {
        if (px >= g_triggers[i].x && px < (g_triggers[i].x + g_triggers[i].w) &&
            py >= g_triggers[i].y && py < (g_triggers[i].y + g_triggers[i].h)) {
            if (g_triggers[i].script) {
                vm_start_script(g_triggers[i].script);
            }
        }
    }
}
