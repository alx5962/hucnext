/*
 * PCE Studio Engine - Screen Fade Implementation
 * Fast hardware palette fading for PC Engine (VCE)
 */

#include "include/fade.h"

#asm
_fade_table_g:
  .db $00, $20, $40, $60, $80, $A0, $C0, $E0
_fade_table_r:
  .db $00, $08, $10, $18, $20, $28, $30, $38
_fade_table_b:
  .db $00, $01, $02, $03, $04, $05, $06, $07
#endasm

void fade_init(void) {
  g_fade_step = 0;
  g_fade_dir = FADE_DIR_NONE;
  g_fade_timer = 0;
  g_fade_delay = 0;
  g_fade_active = 0;
}

void fade_backup_palette(void) {
#asm
  jsr xfer_palette

  cla
  sta color_reg_l
  sta color_reg_h
  tai color_data, _g_scene_palette, 1024
#endasm
}

void fade_apply(int step) {
  g_fade_step = step;
#asm
  ; Get step from global g_fade_step into X register
  ldx _g_fade_step

  cla
  sta color_reg_l
  sta color_reg_h

  cpx #0
  bne .fa_not_zero
  ; Step 0: full restoration of scene palette
  tia _g_scene_palette, color_data, 1024
  __lbra .fa_done

.fa_not_zero:
  cpx #7
  bcc .fa_do_fade
  ; Step >= 7: all black
  cla
  cly
.fa_black_loop:
  sta color_data
  sta color_data+1
  sta color_data
  sta color_data+1
  iny
  bne .fa_black_loop
  __lbra .fa_done

.fa_do_fade:
  ; 4 pages of 128 colors (256 bytes) each = 512 colors (1024 bytes)
  stw #_g_scene_palette, <__si
  lda #4
  sta <__cl

.fa_page_loop:
  cly
.fa_color_loop:
  ; --- GREEN ---
  iny
  lda [<__si], y
  lsr a
  dey
  lda [<__si], y
  and #%11000000
  ror a
  sec
  sbc _fade_table_g, x
  bcs .fa_g_ok
  cla
.fa_g_ok:
  asl a
  sta <__temp
  cla
  rol a
  sta <__ch

  ; --- RED ---
  lda [<__si], y
  and #%00111000
  sec
  sbc _fade_table_r, x
  bcs .fa_r_ok
  cla
.fa_r_ok:
  tsb <__temp

  ; --- BLUE ---
  lda [<__si], y
  and #%00000111
  sec
  sbc _fade_table_b, x
  bcs .fa_b_ok
  cla
.fa_b_ok:
  ora <__temp
  sta color_data
  lda <__ch
  sta color_data+1

  iny
  iny
  bne .fa_color_loop

  inc <__si+1
  dec <__cl
  bne .fa_page_loop

.fa_done:
#endasm
}

int fade_speed_to_delay(int speed) {
  switch (speed) {
    case 0: return 0;
    case 1: return 2;
    case 2: return 3;
    case 3: return 5;
    case 4: return 8;
    case 5: return 12;
    case 6: return 16;
    default: return 3;
  }
}

void fade_in(int speed) {
  if (g_fade_step <= 0) {
    g_fade_step = 0;
    g_fade_active = 0;
    g_fade_dir = FADE_DIR_NONE;
    return;
  }
  if (speed == 0) {
    g_fade_step = 0;
    fade_apply(0);
    g_fade_active = 0;
    g_fade_dir = FADE_DIR_NONE;
    return;
  }
  g_fade_dir = FADE_DIR_IN;
  g_fade_delay = fade_speed_to_delay(speed);
  g_fade_timer = g_fade_delay;
  g_fade_active = 1;
}

void fade_out(int speed) {
  if (g_fade_step >= 7) {
    g_fade_step = 7;
    g_fade_active = 0;
    g_fade_dir = FADE_DIR_NONE;
    return;
  }
  if (g_fade_step == 0) {
    fade_backup_palette();
  }
  if (speed == 0) {
    g_fade_step = 7;
    fade_apply(7);
    g_fade_active = 0;
    g_fade_dir = FADE_DIR_NONE;
    return;
  }
  g_fade_dir = FADE_DIR_OUT;
  g_fade_delay = fade_speed_to_delay(speed);
  g_fade_timer = g_fade_delay;
  g_fade_active = 1;
}

void fade_update(void) {
  if (!g_fade_active)
    return;

  if (g_fade_timer > 0) {
    g_fade_timer--;
    return;
  }

  g_fade_timer = g_fade_delay;

  if (g_fade_dir == FADE_DIR_IN) {
    if (g_fade_step > 0) {
      g_fade_step--;
      fade_apply(g_fade_step);
      if (g_fade_step == 0) {
        g_fade_active = 0;
        g_fade_dir = FADE_DIR_NONE;
      }
    } else {
      g_fade_active = 0;
      g_fade_dir = FADE_DIR_NONE;
    }
  } else if (g_fade_dir == FADE_DIR_OUT) {
    if (g_fade_step < 7) {
      g_fade_step++;
      fade_apply(g_fade_step);
      if (g_fade_step >= 7) {
        g_fade_active = 0;
        g_fade_dir = FADE_DIR_NONE;
      }
    } else {
      g_fade_active = 0;
      g_fade_dir = FADE_DIR_NONE;
    }
  }
}
