#ifndef PCE_TRIGGER_H
#define PCE_TRIGGER_H

#define MAX_SCENE_TRIGGERS 32

#define TRIG_SCENE(i)         g_trigger_table[(i) * 8 + 0]
#define TRIG_X(i)             g_trigger_table[(i) * 8 + 1]
#define TRIG_Y(i)             g_trigger_table[(i) * 8 + 2]
#define TRIG_W(i)             g_trigger_table[(i) * 8 + 3]
#define TRIG_H(i)             g_trigger_table[(i) * 8 + 4]
#define TRIG_TARGET_SCENE(i)  g_trigger_table[(i) * 8 + 5]
#define TRIG_TARGET_X(i)      g_trigger_table[(i) * 8 + 6]
#define TRIG_TARGET_Y(i)      g_trigger_table[(i) * 8 + 7]

void trigger_init(void);
void trigger_load_all(void);
void trigger_activate_scene(int scene_id);
void trigger_check(int px, int py);
int trigger_find_at(int px, int py);
int interact_trigger_leave(int scene_num, int trigger_num);

#endif /* PCE_TRIGGER_H */

