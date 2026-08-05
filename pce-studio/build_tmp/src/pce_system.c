#include "include/pce_system.h"

void pce_sys_init(void) {
    set_screen_size(SCR_SIZE_32x32);
    disp_on();
}

void pce_sys_vsync(void) {
    vsync();
    satb_update();
}

unsigned int pce_sys_read_joy(int index) {
    return joy(index);
}
