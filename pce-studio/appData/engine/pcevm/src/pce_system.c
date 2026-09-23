#include "include/pce_system.h"

void pce_sys_init(void) {
    set_screen_size(SCR_SIZE_32x32);
    
    // Clear initial palette colors to black
    set_color(0, 0x0000);
    set_color(1, 0x0000);
    set_color(2, 0x0000);
    set_color(3, 0x0000);

    disp_off();
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
