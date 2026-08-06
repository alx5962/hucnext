#include "include/vm.h"
#include "include/actor.h"
#include "include/pce_sound.h"

int g_vm_vars[VM_MAX_VARS];
static vm_context_t g_ctx;

void vm_init(void) {
    int i;
    for (i = 0; i < VM_MAX_VARS; i++) {
        g_vm_vars[i] = 0;
    }
    g_ctx.pc = 0;
    g_ctx.wait_frames = 0;
    g_ctx.active = 0;
}

void vm_start_script(unsigned char* script_ptr) {
    g_ctx.pc = script_ptr;
    g_ctx.wait_frames = 0;
    g_ctx.active = 1;
}

int vm_get_var(int index) {
    if (index >= 0 && index < VM_MAX_VARS) {
        return g_vm_vars[index];
    }
    return 0;
}

void vm_set_var(int index, int val) {
    if (index >= 0 && index < VM_MAX_VARS) {
        g_vm_vars[index] = val;
    }
}

void vm_step(void) {
    unsigned char op;
    unsigned char v, val, actor_id, x, y, frames;
    unsigned int* song_ptr;
    unsigned int ptr_lo;
    unsigned int ptr_hi;

    if (!g_ctx.active || !g_ctx.pc) return;
    
    if (g_ctx.wait_frames > 0) {
        g_ctx.wait_frames--;
        return;
    }

    while (g_ctx.active && g_ctx.wait_frames == 0) {
        op = *g_ctx.pc++;
        switch (op) {
            case OP_NOP:
                break;
            case OP_SET_VAR:
                v = *g_ctx.pc++;
                val = *g_ctx.pc++;
                vm_set_var(v, val);
                break;
            case OP_ADD_VAR:
                v = *g_ctx.pc++;
                val = *g_ctx.pc++;
                vm_set_var(v, vm_get_var(v) + val);
                break;
            case OP_ACTOR_POS:
                actor_id = *g_ctx.pc++;
                x = *g_ctx.pc++;
                y = *g_ctx.pc++;
                actor_set_pos(actor_id, x, y);
                break;
            case OP_WAIT:
                frames = *g_ctx.pc++;
                g_ctx.wait_frames = frames;
                break;
            case OP_MUSIC_PLAY:
                ptr_lo = *g_ctx.pc++;
                ptr_hi = *g_ctx.pc++;
                song_ptr = (unsigned int*)((ptr_hi << 8) | ptr_lo);
                pce_sound_play(song_ptr);
                break;
            case OP_MUSIC_STOP:
                pce_sound_stop();
                break;
            case OP_END:
                g_ctx.active = 0;
                break;
            default:
                g_ctx.active = 0;
                break;
        }
    }
}
