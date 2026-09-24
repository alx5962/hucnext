/*
 * PCE Studio Engine - Screen Fade Implementation
 * Fast hardware palette fading for PC Engine (VCE)
 */

#include "include/fade.h"

#asm
_fade_lut_b:
  ; Level 0 (step 7 - black)
  .db 0, 0, 0, 0, 0, 0, 0, 0
  ; Level 1 (step 6 - 14%)
  .db 0, 0, 0, 1, 1, 1, 1, 1
  ; Level 2 (step 5 - 28%)
  .db 0, 0, 1, 1, 1, 1, 2, 2
  ; Level 3 (step 4 - 43%)
  .db 0, 0, 1, 1, 2, 2, 3, 3
  ; Level 4 (step 3 - 57%)
  .db 0, 1, 1, 2, 2, 3, 3, 4
  ; Level 5 (step 2 - 71%)
  .db 0, 1, 1, 2, 3, 4, 4, 5
  ; Level 6 (step 1 - 86%)
  .db 0, 1, 2, 3, 3, 4, 5, 6
  ; Level 7 (step 0 - 100%)
  .db 0, 1, 2, 3, 4, 5, 6, 7

_fade_lut_r:
  ; Level 0 (step 7 - black)
  .db $00, $00, $00, $00, $00, $00, $00, $00
  ; Level 1 (step 6 - 14%)
  .db $00, $00, $00, $08, $08, $08, $08, $08
  ; Level 2 (step 5 - 28%)
  .db $00, $00, $08, $08, $08, $08, $10, $10
  ; Level 3 (step 4 - 43%)
  .db $00, $00, $08, $08, $10, $10, $18, $18
  ; Level 4 (step 3 - 57%)
  .db $00, $08, $08, $10, $10, $18, $18, $20
  ; Level 5 (step 2 - 71%)
  .db $00, $08, $08, $10, $18, $20, $20, $28
  ; Level 6 (step 1 - 86%)
  .db $00, $08, $10, $18, $18, $20, $28, $30
  ; Level 7 (step 0 - 100%)
  .db $00, $08, $10, $18, $20, $28, $30, $38

_fade_lut_g_lo:
  ; Level 0 (step 7 - black)
  .db $00, $00, $00, $00, $00, $00, $00, $00
  ; Level 1 (step 6 - 14%)
  .db $00, $00, $00, $40, $40, $40, $40, $40
  ; Level 2 (step 5 - 28%)
  .db $00, $00, $40, $40, $40, $40, $80, $80
  ; Level 3 (step 4 - 43%)
  .db $00, $00, $40, $40, $80, $80, $C0, $C0
  ; Level 4 (step 3 - 57%)
  .db $00, $40, $40, $80, $80, $C0, $C0, $00
  ; Level 5 (step 2 - 71%)
  .db $00, $40, $40, $80, $C0, $00, $00, $40
  ; Level 6 (step 1 - 86%)
  .db $00, $40, $80, $C0, $C0, $00, $40, $80
  ; Level 7 (step 0 - 100%)
  .db $00, $40, $80, $C0, $00, $40, $80, $C0

_fade_lut_g_hi:
  ; Level 0 (step 7 - black)
  .db 0, 0, 0, 0, 0, 0, 0, 0
  ; Level 1 (step 6 - 14%)
  .db 0, 0, 0, 0, 0, 0, 0, 0
  ; Level 2 (step 5 - 28%)
  .db 0, 0, 0, 0, 0, 0, 0, 0
  ; Level 3 (step 4 - 43%)
  .db 0, 0, 0, 0, 0, 0, 0, 0
  ; Level 4 (step 3 - 57%)
  .db 0, 0, 0, 0, 0, 0, 0, 1
  ; Level 5 (step 2 - 71%)
  .db 0, 0, 0, 0, 0, 1, 1, 1
  ; Level 6 (step 1 - 86%)
  .db 0, 0, 0, 0, 0, 1, 1, 1
  ; Level 7 (step 0 - 100%)
  .db 0, 0, 0, 0, 1, 1, 1, 1
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
  ; Calculate level offset: (7 - g_fade_step) * 8
  lda #7
  sec
  sbc _g_fade_step
  asl a
  asl a
  asl a
  sta <__dl

  ; 4 pages of 128 colors (256 bytes) each = 512 colors (1024 bytes)
  stw #_g_scene_palette, <__si
  lda #4
  sta <__dh

.fa_page_loop:
  cly
.fa_color_loop:
  ; Read low byte
  lda [<__si], y
  sta <__temp
  iny
  ; Read high byte
  lda [<__si], y
  iny
  phy

  ; --- GREEN ---
  ; Original Green = ((high_byte & 1) << 2) | (low_byte >> 6)
  and #$01
  asl a
  asl a
  sta <__ch
  lda <__temp
  lsr a
  lsr a
  lsr a
  lsr a
  lsr a
  lsr a
  ora <__ch
  ora <__dl
  tay
  lda _fade_lut_g_hi, y
  pha
  lda _fade_lut_g_lo, y
  sta <__ch

  ; --- RED ---
  ; Original Red = (low_byte >> 3) & 7
  lda <__temp
  lsr a
  lsr a
  lsr a
  and #$07
  ora <__dl
  tay
  lda _fade_lut_r, y
  ora <__ch
  sta <__ch

  ; --- BLUE ---
  ; Original Blue = low_byte & 7
  lda <__temp
  and #$07
  ora <__dl
  tay
  lda _fade_lut_b, y
  ora <__ch

  ; Write low byte then high byte to VCE
  sta color_data
  pla
  sta color_data+1

  ply
  bne .fa_color_loop

  inc <__si+1
  dec <__dh
  bne .fa_page_loop

.fa_done:
#endasm
}

int fade_speed_to_delay(int speed) {
  switch (speed) {
    case 0: return 0;
    case 1: return 0;  /* 1 frame per step: 7 frames total (~0.11s, snappy!) */
    case 2: return 1;  /* 2 frames per step: 14 frames total (~0.23s, standard GBS) */
    case 3: return 2;  /* 3 frames per step: 21 frames total (~0.35s) */
    case 4: return 3;  /* 4 frames per step: 28 frames total (~0.46s) */
    case 5: return 5;  /* 6 frames per step: 42 frames total */
    case 6: return 7;  /* 8 frames per step: 56 frames total */
    default: return 1;
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
