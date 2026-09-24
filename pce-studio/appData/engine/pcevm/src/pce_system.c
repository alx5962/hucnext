#include "include/pce_system.h"
#include "include/fade.h"

void pce_sys_init(void) {
    set_screen_size(SCR_SIZE_32x32);
    disp_off();
    fade_init();
    fade_apply(7);
}

int pce_sys_vsync(void) {
    int elapsed;
    satb_update();
    elapsed = vsync();
    return (elapsed > 0) ? elapsed : 1;
}

unsigned int pce_sys_read_joy(int index) {
    return joy(index);
}
