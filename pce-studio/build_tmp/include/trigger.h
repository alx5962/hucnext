#ifndef PCE_TRIGGER_H
#define PCE_TRIGGER_H

typedef struct {
    int x;
    int y;
    int w;
    int h;
    unsigned char* script;
} pce_trigger_t;

#define MAX_TRIGGERS 16

extern pce_trigger_t g_triggers[MAX_TRIGGERS];
extern int g_trigger_count;

void trigger_init(void);
void trigger_add(int x, int y, int w, int h, unsigned char* script);
void trigger_check(int px, int py);

#endif /* PCE_TRIGGER_H */
