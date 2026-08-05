#include "include/pce_system.h"

void pce_sys_init(void) {
    set_screen_size(SCR_SIZE_32x32);
    
    // Set default visible background & text palette (White backdrop, dark pixels)
    set_color(0, 0x01CE); // Light cyan/blue background
    set_color(1, 0x0000); // Black foreground
    set_color(2, 0x0038); // Red
    set_color(3, 0x01C0); // Green

    disp_on();
}

void pce_sys_vsync(void) {
    vsync();
    satb_update();
}

unsigned int pce_sys_read_joy(int index) {
    return joy(index);
}
