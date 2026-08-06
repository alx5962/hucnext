#include "include/pce_sound.h"

/* Hardware PSG IO ports mapped at 0x0800 - 0x0807 */
#define PSG_CH ((unsigned char *)0x0800)
#define PSG_BAL ((unsigned char *)0x0801)
#define PSG_FREQLO ((unsigned char *)0x0802)
#define PSG_FREQHI ((unsigned char *)0x0803)
#define PSG_CTRL ((unsigned char *)0x0804)
#define PSG_CHBAL ((unsigned char *)0x0805)
#define PSG_DATA ((unsigned char *)0x0806)
#define PSG_NOISE ((unsigned char *)0x0807)

/* PCE 12-bit frequency divisor table for 72 notes (C_3 to B_8) */
static const unsigned short g_pce_note_freq[72] = {
    855, 807, 762, 719, 679, 641, 605, 571, 539, 508, 480, 453, 428, 404, 381,
    360, 339, 320, 302, 285, 269, 254, 240, 227, 214, 202, 190, 180, 170, 160,
    151, 143, 135, 127, 120, 113, 107, 101, 95,  90,  85,  80,  76,  71,  67,
    64,  60,  57,  53,  50,  48,  45,  42,  40,  38,  36,  34,  32,  30,  28,
    27,  25,  24,  22,  21,  20,  19,  18,  17,  16,  15,  14};

/* Duty waveforms: 12.5%, 25%, 50%, 75% flattened 1D array (4 * 32 = 128 bytes)
 */
static const unsigned char g_duty_table[128] = {
    /* 12.5% */ 31,
    31,
    31,
    31,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    /* 25.0% */ 31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    /* 50.0% */ 31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    /* 75.0% */ 31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    31,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0};

static unsigned int *g_pce_song;
static unsigned char g_pce_music_playing;
static unsigned char g_pce_order_idx;
static unsigned char g_pce_row_idx;
static unsigned char g_pce_tick_cnt;
static unsigned char g_ch_vol[4];
static unsigned char g_ch_inst[4];
static unsigned char g_ch_duty[2];
static unsigned char g_next_order_idx;
static unsigned char g_next_row_idx;
static unsigned char g_has_jump;

static void load_wave_ram(unsigned char ch, unsigned char *wave_samples) {
  int i;
  *PSG_CH = ch;
  *PSG_CTRL = 0x00;
  for (i = 0; i < 32; i++) {
    *PSG_DATA = wave_samples[i];
  }
  *PSG_CTRL = 0x80 | g_ch_vol[ch < 3 ? ch : 3];
}

void pce_sound_init(void) {
  int i;
  *PSG_BAL = 0xFF;
  for (i = 0; i < 6; i++) {
    *PSG_CH = i;
    *PSG_CTRL = 0x00;
    *PSG_CHBAL = 0xFF;
    if (i >= 4) {
      *PSG_NOISE = 0x00;
    }
  }
  for (i = 0; i < 4; i++) {
    g_ch_vol[i] = 31;
    g_ch_inst[i] = 0xFF;
  }
  g_ch_duty[0] = 0xFF;
  g_ch_duty[1] = 0xFF;
  g_pce_music_playing = 0;
  g_pce_song = 0;
  g_pce_order_idx = 0;
  g_pce_row_idx = 0;
  g_pce_tick_cnt = 0;
  g_has_jump = 0;

  load_wave_ram(0, (unsigned char *)&g_duty_table[2 * 32]);
  load_wave_ram(1, (unsigned char *)&g_duty_table[2 * 32]);
}

void pce_sound_play(unsigned int *song) {
  pce_sound_init();
  if (!song)
    return;
  g_pce_song = song;
  g_pce_order_idx = 0;
  g_pce_row_idx = 0;
  g_pce_tick_cnt = 0xFF;
  g_pce_music_playing = 1;
}

void pce_sound_stop(void) { pce_sound_init(); }

static void process_channel(int track, unsigned char *pattern_ptr) {
  unsigned char note, inst_eff, param;
  unsigned char inst, effect, wave_samples[32];
  unsigned short freq;
  unsigned char pce_ch;
  unsigned char duty_idx;
  unsigned char wave_idx;
  unsigned char noise_freq;
  unsigned char *duty_instrs;
  unsigned char *wave_instrs;
  unsigned char *noise_instrs;
  unsigned char *waves_ptr;
  unsigned char *d_inst;
  unsigned char *w_inst;
  unsigned char *n_inst;
  unsigned char *raw_wave;
  int i;

  pce_ch = (track < 3) ? track : 4;

  if (!pattern_ptr)
    return;

  note = pattern_ptr[g_pce_row_idx * 3 + 0];
  inst_eff = pattern_ptr[g_pce_row_idx * 3 + 1];
  param = pattern_ptr[g_pce_row_idx * 3 + 2];

  inst = (inst_eff >> 4) & 0x0F;
  effect = inst_eff & 0x0F;

  if (effect == 0x0C) {
    g_ch_vol[track] = (param & 0x0F) * 2;
    *PSG_CH = pce_ch;
    *PSG_CTRL = 0x80 | g_ch_vol[track];
  } else if (effect == 0x0B) {
    g_next_order_idx = param;
    g_next_row_idx = 0;
    g_has_jump = 1;
  } else if (effect == 0x0D) {
    g_next_order_idx = g_pce_order_idx + 1;
    g_next_row_idx = 0;
    g_has_jump = 1;
  }

  if (note != 0xFF && note < 72) {
    freq = g_pce_note_freq[note];

    *PSG_CH = pce_ch;
    *PSG_FREQLO = freq & 0xFF;
    *PSG_FREQHI = (freq >> 8) & 0x0F;

    duty_instrs = (unsigned char *)(g_pce_song[6]);
    wave_instrs = (unsigned char *)(g_pce_song[7]);
    noise_instrs = (unsigned char *)(g_pce_song[8]);
    waves_ptr = (unsigned char *)(g_pce_song[10]);

    if (track == 0 || track == 1) {
      duty_idx = 2;
      if (inst > 0 && duty_instrs) {
        d_inst = &duty_instrs[(inst - 1) * 6];
        duty_idx = (d_inst[1] >> 6) & 0x03;
        g_ch_vol[track] = ((d_inst[2] >> 4) & 0x0F) * 2;
      }
      if (g_ch_duty[track] != duty_idx) {
        g_ch_duty[track] = duty_idx;
        load_wave_ram(pce_ch, (unsigned char *)&g_duty_table[duty_idx * 32]);
      } else {
        *PSG_CH = pce_ch;
        *PSG_CTRL = 0x80 | g_ch_vol[track];
      }
    } else if (track == 2) {
      wave_idx = 0;
      if (inst > 0 && wave_instrs) {
        w_inst = &wave_instrs[(inst - 1) * 6];
        wave_idx = w_inst[2];
        g_ch_vol[track] = ((w_inst[1] >> 5) & 0x03) * 10;
      }
      if (waves_ptr && (g_ch_inst[2] != inst || inst == 0)) {
        g_ch_inst[2] = inst;
        raw_wave = &waves_ptr[wave_idx * 16];
        for (i = 0; i < 16; i++) {
          wave_samples[i * 2 + 0] = ((raw_wave[i] >> 4) & 0x0F) * 2;
          wave_samples[i * 2 + 1] = (raw_wave[i] & 0x0F) * 2;
        }
        load_wave_ram(pce_ch, wave_samples);
      } else {
        *PSG_CH = pce_ch;
        *PSG_CTRL = 0x80 | g_ch_vol[track];
      }
    } else if (track == 3) {
      noise_freq = 31 - (note % 32);
      if (inst > 0 && noise_instrs) {
        n_inst = &noise_instrs[(inst - 1) * 6];
        g_ch_vol[track] = ((n_inst[0] >> 4) & 0x0F) * 2;
      }
      *PSG_CH = 4;
      *PSG_NOISE = 0x80 | (noise_freq & 0x1F);
      *PSG_CTRL = 0x80 | g_ch_vol[track];
    }
  }
}

void pce_sound_update(void) {
  unsigned char ticks_per_row;
  unsigned char *order_cnt_ptr;
  unsigned char **order1;
  unsigned char **order2;
  unsigned char **order3;
  unsigned char **order4;
  unsigned char max_orders;
  unsigned char *p0;
  unsigned char *p1;
  unsigned char *p2;
  unsigned char *p3;

  if (!g_pce_music_playing || !g_pce_song)
    return;

  ticks_per_row = (unsigned char)(g_pce_song[0]);

  if (g_pce_tick_cnt != 0xFF) {
    g_pce_tick_cnt++;
    if (g_pce_tick_cnt < ticks_per_row) {
      return;
    }
  }
  g_pce_tick_cnt = 0;

  order_cnt_ptr = (unsigned char *)(g_pce_song[1]);
  max_orders = (*order_cnt_ptr) / 2;

  order1 = (unsigned char **)(g_pce_song[2]);
  order2 = (unsigned char **)(g_pce_song[3]);
  order3 = (unsigned char **)(g_pce_song[4]);
  order4 = (unsigned char **)(g_pce_song[5]);

  p0 = order1[g_pce_order_idx];
  p1 = order2[g_pce_order_idx];
  p2 = order3[g_pce_order_idx];
  p3 = order4[g_pce_order_idx];

  g_has_jump = 0;
  process_channel(0, p0);
  process_channel(1, p1);
  process_channel(2, p2);
  process_channel(3, p3);

  if (g_has_jump) {
    g_pce_order_idx = g_next_order_idx;
    g_pce_row_idx = g_next_row_idx;
    if (g_pce_order_idx >= max_orders) {
      g_pce_order_idx = 0;
    }
  } else {
    g_pce_row_idx++;
    if (g_pce_row_idx >= 64) {
      g_pce_row_idx = 0;
      g_pce_order_idx++;
      if (g_pce_order_idx >= max_orders) {
        g_pce_order_idx = 0;
      }
    }
  }
}
