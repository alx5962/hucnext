#ifndef PCE_VM_H
#define PCE_VM_H

#define VM_MAX_VARS 256
#define VM_STACK_SIZE 32

/* Opcode definitions for script VM */
#define OP_NOP         0x00
#define OP_SET_VAR     0x01
#define OP_ADD_VAR     0x02
#define OP_SUB_VAR     0x03
#define OP_IF_TRUE     0x04
#define OP_JUMP        0x05
#define OP_ACTOR_POS   0x06
#define OP_LOAD_SCENE  0x07
#define OP_WAIT        0x08
#define OP_MUSIC_PLAY  0x09
#define OP_MUSIC_STOP  0x0A
#define OP_ACTOR_HIDE  0x0B
#define OP_ACTOR_SHOW  0x0C
#define OP_END         0xFF

typedef struct {
    unsigned char* pc;
    int wait_frames;
    int active;
} vm_context_t;

void vm_init(void);
void vm_start_script(unsigned char* script_ptr);
void vm_step(void);
int vm_get_var(int index);
void vm_set_var(int index, int val);

#endif /* PCE_VM_H */
