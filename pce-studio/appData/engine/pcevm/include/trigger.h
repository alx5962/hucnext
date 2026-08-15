#ifndef PCE_TRIGGER_H
#define PCE_TRIGGER_H

typedef struct {
    int scene_id;
    int x;
    int y;
    int w;
    int h;
    int target_scene;
    int target_x;
    int target_y;
    unsigned char* script;
} pce_trigger_t;

#define MAX_TRIGGERS 128

#ifndef PCE_TRIGGER_C
extern pce_trigger_t g_triggers[MAX_TRIGGERS];
extern int g_trigger_count;
#endif

void trigger_init(void);
void trigger_load_all(void);
void trigger_add(int scene_id, int x, int y, int w, int h, int target_scene, int target_x, int target_y, unsigned char* script);
void trigger_check(int px, int py);

#endif /* PCE_TRIGGER_H */
