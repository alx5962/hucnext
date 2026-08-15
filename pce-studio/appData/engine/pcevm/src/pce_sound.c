static unsigned char g_psg_reg_ch;
static unsigned char g_psg_reg_val;
static unsigned short g_psg_reg_freq;

static void hw_set_ch(unsigned char ch) {
  g_psg_reg_ch = ch;
#asm
  lda _g_psg_reg_ch
  sta psg_ch
#endasm
}

static void hw_set_ctrl(unsigned char ctrl) {
  g_psg_reg_val = ctrl;
#asm
  lda _g_psg_reg_val
  sta psg_ctrl
#endasm
}

static void hw_set_freq(unsigned short freq) {
  g_psg_reg_freq = freq;
#asm
  lda _g_psg_reg_freq
  sta psg_freqlo
  lda _g_psg_reg_freq+1
  sta psg_freqhi
#endasm
}

static void hw_set_pan(unsigned char pan) {
  g_psg_reg_val = pan;
#asm
  lda _g_psg_reg_val
  sta psg_pan
#endasm
}

static void hw_set_noise(unsigned char noise) {
  g_psg_reg_val = noise;
#asm
  lda _g_psg_reg_val
  sta psg_noise
#endasm
}

static void hw_set_mainvol(unsigned char vol) {
  g_psg_reg_val = vol;
#asm
  lda _g_psg_reg_val
  sta psg_mainvol
#endasm
}

static void hw_set_wave_data(unsigned char data) {
  g_psg_reg_val = data;
#asm
  lda _g_psg_reg_val
  sta psg_wavebuf
#endasm
}

/* PCE 12-bit frequency divisor table for 72 notes (C_3 to B_8) */
static const unsigned short g_pce_note_freq[72] = {
    855, 807, 762, 719, 679, 641, 605, 571, 539, 508, 480, 453,
    428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 227,
    214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113,
    107, 101, 95,  90,  85,  80,  76,  71,  67,  64,  60,  57,
    53,  50,  48,  45,  42,  40,  38,  36,  34,  32,  30,  28,
    27,  25,  24,  22,  21,  20,  19,  18,  17,  16,  15,  14
};

/* Vibrato sine table (16 steps) */
static const char g_vibrato_table[16] = {
    0, 6, 11, 15, 16, 15, 11, 6, 0, -6, -11, -15, -16, -15, -11, -6
};

/* Duty waveforms: 12.5%, 25%, 50%, 75% DC-centered (midpoint 16, 4 * 32 = 128 bytes) */
static const unsigned char g_duty_table[128] = {
    /* 12.5% (Bright Pulse / Harpsichord) */
    16, 22, 27, 30, 31, 30, 27, 22, 16, 12,  9,  7,  5,  4,  3,  3,
     4,  5,  7,  9, 11, 13, 14, 15, 16, 16, 16, 16, 16, 16, 16, 16,
    /* 25.0% (Warm Acoustic Piano / Pulse) */
    16, 21, 26, 29, 31, 31, 30, 28, 24, 19, 14, 10,  7,  5,  3,  2,
     2,  3,  5,  7,  9, 11, 13, 14, 15, 16, 16, 16, 16, 16, 16, 16,
    /* 50.0% (Flute / Clarinet / Pure Square) */
    16, 21, 25, 28, 30, 31, 31, 31, 31, 31, 30, 28, 25, 21, 16, 11,
     7,  4,  2,  1,  1,  1,  1,  1,  2,  4,  7, 11, 13, 14, 15, 16,
    /* 75.0% (Full Rich Piano) */
    16, 19, 23, 26, 28, 30, 31, 31, 31, 31, 30, 28, 26, 23, 19, 16,
    13, 10,  7,  5,  3,  2,  1,  1,  2,  3,  5,  8, 11, 13, 15, 16
};

static unsigned int *g_pce_song;
static unsigned char g_pce_music_playing;
static unsigned char g_pce_order_idx;
static unsigned char g_pce_row_idx;
static unsigned char g_pce_tick_cnt;
static unsigned char g_ticks_per_row;

/* Per-channel state: CH0=Duty1, CH1=Duty2, CH2=Wave, CH3=Noise (mapped to PCE CH4) */
static unsigned short g_ch_period[4];
static unsigned short g_ch_target_period[4];
static unsigned char g_ch_note[4];
static unsigned char g_ch_vol[4];
static unsigned char g_ch_env_val[4];
static unsigned char g_ch_env_dir[4];
static unsigned char g_ch_env_step[4];
static unsigned char g_ch_env_timer[4];
static unsigned char g_ch_len_enabled[4];
static unsigned char g_ch_len_cnt[4];
static unsigned char g_ch_active[4];
static unsigned char g_ch_duty[2];
static unsigned char g_ch_wave_idx;

/* Effect states per channel */
static unsigned char g_fx_type[4];
static unsigned char g_fx_param[4];
static unsigned char g_fx_vib_phase[4];
static unsigned char g_fx_delayed_note[4];
static unsigned char g_fx_delayed_inst[4];

static unsigned char g_next_order_idx;
static unsigned char g_next_row_idx;
static unsigned char g_has_jump;

static unsigned char g_ch_last_inst[4];
static unsigned char g_wave_buf[32];

/* Static pointers to avoid any local stack frame allocations in HuC */
static unsigned char *g_duty_instrs;
static unsigned char *g_wave_instrs;
static unsigned char *g_noise_instrs;
static unsigned char *g_waves_ptr;
static unsigned char *g_d_inst;
static unsigned char *g_w_inst;
static unsigned char *g_n_inst;
static unsigned char *g_raw_wave;

static unsigned char g_t_track;
static unsigned char g_t_note;
static unsigned char g_t_inst;
static unsigned char g_t_pce_ch;
static unsigned char g_t_duty_idx;
static unsigned char g_t_wave_idx;
static unsigned char g_t_noise_freq;
static unsigned char g_t_init_vol;
static unsigned char g_t_nib;
static int g_t_i;

static void load_wave_ram_ch(unsigned char ch) {
  hw_set_ch(ch);
  /* Reset internal waveform write index: 0x40 (DDA on, ch off), then 0x00 (DDA off, ch off) */
  hw_set_ctrl(0x40);
  hw_set_ctrl(0x00);
  for (g_t_i = 0; g_t_i < 32; g_t_i++) {
    hw_set_wave_data(g_wave_buf[g_t_i]);
  }
}

static unsigned short get_track_note_freq(unsigned char track, unsigned char note) {
  if (note >= 72) return 0;
  if (track == 2) {
    if (note >= 12) {
      return g_pce_note_freq[note - 12];
    } else {
      return g_pce_note_freq[note] << 1;
    }
  }
  return g_pce_note_freq[note];
}

static void trigger_note_core_current(void) {
  if (g_t_note >= 72)
    return;

  g_t_pce_ch = (g_t_track < 3) ? g_t_track : 4;
  g_ch_note[g_t_track] = g_t_note;
  g_ch_period[g_t_track] = get_track_note_freq(g_t_track, g_t_note);

  g_duty_instrs = (unsigned char *)(g_pce_song[6]);
  g_wave_instrs = (unsigned char *)(g_pce_song[7]);
  g_noise_instrs = (unsigned char *)(g_pce_song[8]);
  g_waves_ptr = (unsigned char *)(g_pce_song[10]);

  if (g_t_inst > 0) {
    g_ch_last_inst[g_t_track] = g_t_inst;
  } else if (g_ch_last_inst[g_t_track] > 0) {
    g_t_inst = g_ch_last_inst[g_t_track];
  }

  if (g_t_track == 0 || g_t_track == 1) {
    g_t_duty_idx = 2;
    g_t_init_vol = 15;
    g_ch_env_dir[g_t_track] = 0;
    g_ch_env_step[g_t_track] = 0;
    g_ch_len_enabled[g_t_track] = 0;

    if (g_t_inst > 0 && g_duty_instrs) {
      g_d_inst = &g_duty_instrs[(g_t_inst - 1) * 6];
      g_t_duty_idx = (g_d_inst[1] >> 6) & 0x03;
      g_t_init_vol = (g_d_inst[2] >> 4) & 0x0F;
      g_ch_env_dir[g_t_track] = (g_d_inst[2] >> 3) & 0x01;
      g_ch_env_step[g_t_track] = g_d_inst[2] & 0x07;
      g_ch_len_enabled[g_t_track] = (g_d_inst[5] >> 6) & 0x01;
      g_ch_len_cnt[g_t_track] = 64 - (g_d_inst[1] & 0x3F);
    }

    g_ch_env_val[g_t_track] = g_t_init_vol;
    g_ch_vol[g_t_track] = (g_t_init_vol << 1) | (g_t_init_vol > 7 ? 1 : 0);
    g_ch_env_timer[g_t_track] = 0;
    g_ch_active[g_t_track] = (g_t_init_vol > 0 || (g_ch_env_dir[g_t_track] == 1 && g_ch_env_step[g_t_track] > 0)) ? 1 : 0;

    if (g_ch_duty[g_t_track] != g_t_duty_idx) {
      g_ch_duty[g_t_track] = g_t_duty_idx;
      for (g_t_i = 0; g_t_i < 32; g_t_i++) {
        g_wave_buf[g_t_i] = g_duty_table[g_t_duty_idx * 32 + g_t_i];
      }
      load_wave_ram_ch(g_t_pce_ch);
    }

    hw_set_ch(g_t_pce_ch);
    hw_set_freq(g_ch_period[g_t_track]);
    hw_set_ctrl(0x80 | g_ch_vol[g_t_track]);
  } else if (g_t_track == 2) {
    g_t_wave_idx = 0;
    g_t_init_vol = 31;
    g_ch_len_enabled[g_t_track] = 0;
    g_ch_env_step[g_t_track] = 0;

    if (g_t_inst > 0 && g_wave_instrs) {
      g_w_inst = &g_wave_instrs[(g_t_inst - 1) * 6];
      g_ch_len_cnt[g_t_track] = 256 - g_w_inst[0];
      g_ch_len_enabled[g_t_track] = (g_w_inst[5] >> 6) & 0x01;
      g_t_i = (g_w_inst[1] >> 5) & 0x03;
      if (g_t_i == 0) g_t_init_vol = 0;
      else if (g_t_i == 1) g_t_init_vol = 31;
      else if (g_t_i == 2) g_t_init_vol = 16;
      else g_t_init_vol = 8;
      g_t_wave_idx = g_w_inst[2];
    }

    g_ch_vol[g_t_track] = g_t_init_vol;
    g_ch_active[g_t_track] = (g_t_init_vol > 0) ? 1 : 0;

    if (g_waves_ptr && g_ch_wave_idx != g_t_wave_idx) {
      g_ch_wave_idx = g_t_wave_idx;
      g_raw_wave = &g_waves_ptr[g_t_wave_idx * 16];
      for (g_t_i = 0; g_t_i < 16; g_t_i++) {
        g_t_nib = (g_raw_wave[g_t_i] >> 4) & 0x0F;
        g_wave_buf[g_t_i * 2 + 0] = (g_t_nib * 2) + 1;
        g_t_nib = g_raw_wave[g_t_i] & 0x0F;
        g_wave_buf[g_t_i * 2 + 1] = (g_t_nib * 2) + 1;
      }
      load_wave_ram_ch(g_t_pce_ch);
    }

    hw_set_ch(g_t_pce_ch);
    hw_set_freq(g_ch_period[g_t_track]);
    hw_set_ctrl(0x80 | g_ch_vol[g_t_track]);
  } else if (g_t_track == 3) {
    g_t_init_vol = 15;
    g_ch_env_dir[g_t_track] = 0;
    g_ch_env_step[g_t_track] = 0;
    g_ch_len_enabled[g_t_track] = 0;

    if (g_t_inst > 0 && g_noise_instrs) {
      g_n_inst = &g_noise_instrs[(g_t_inst - 1) * 6];
      g_t_init_vol = (g_n_inst[0] >> 4) & 0x0F;
      g_ch_env_dir[g_t_track] = (g_n_inst[0] >> 3) & 0x01;
      g_ch_env_step[g_t_track] = g_n_inst[0] & 0x07;
      g_ch_len_enabled[g_t_track] = (g_n_inst[3] >> 6) & 0x01;
      g_ch_len_cnt[g_t_track] = 64 - (g_n_inst[3] & 0x3F);
    }

    g_ch_env_val[g_t_track] = g_t_init_vol;
    g_ch_vol[g_t_track] = (g_t_init_vol << 1) | (g_t_init_vol > 7 ? 1 : 0);
    g_ch_env_timer[g_t_track] = 0;
    g_ch_active[g_t_track] = (g_t_init_vol > 0 || (g_ch_env_dir[g_t_track] == 1 && g_ch_env_step[g_t_track] > 0)) ? 1 : 0;

    /* Frequency for noise on PCE: higher note = higher pitch */
    g_t_noise_freq = (g_t_note % 32) & 0x1F;
    hw_set_ch(4);
    hw_set_noise(0x80 | g_t_noise_freq);
    /* Waveform mode OFF (bit 7 = 0), Volume set in bits 0-4 */
    hw_set_ctrl(g_ch_vol[g_t_track]);
  }
}

void pce_sound_init(void) {
  int i;
  hw_set_mainvol(0xFF);
  for (i = 0; i < 6; i++) {
    hw_set_ch(i);
    hw_set_ctrl(0x00);
    hw_set_pan(0xFF);
    if (i >= 4) {
      hw_set_noise(0x00);
    }
  }
  for (i = 0; i < 4; i++) {
    g_ch_period[i] = 0;
    g_ch_target_period[i] = 0;
    g_ch_note[i] = 0xFF;
    g_ch_last_inst[i] = 0;
    g_ch_vol[i] = 0;
    g_ch_env_val[i] = 0;
    g_ch_env_dir[i] = 0;
    g_ch_env_step[i] = 0;
    g_ch_env_timer[i] = 0;
    g_ch_len_enabled[i] = 0;
    g_ch_len_cnt[i] = 0;
    g_ch_active[i] = 0;
    g_fx_type[i] = 0;
    g_fx_param[i] = 0;
    g_fx_vib_phase[i] = 0;
    g_fx_delayed_note[i] = 0xFF;
    g_fx_delayed_inst[i] = 0;
  }
  g_ch_duty[0] = 0xFF;
  g_ch_duty[1] = 0xFF;
  g_ch_wave_idx = 0xFF;
  g_pce_music_playing = 0;
  g_pce_song = 0;
  g_pce_order_idx = 0;
  g_pce_row_idx = 0;
  g_pce_tick_cnt = 0;
  g_ticks_per_row = 6;
  g_has_jump = 0;

  for (g_t_i = 0; g_t_i < 32; g_t_i++) {
    g_wave_buf[g_t_i] = g_duty_table[2 * 32 + g_t_i];
  }
  load_wave_ram_ch(0);
  load_wave_ram_ch(1);
}

void pce_sound_play(unsigned int *song) {
  pce_sound_init();
  if (!song)
    return;
  g_pce_song = song;
  g_ticks_per_row = (unsigned char)(song[0]);
  if (g_ticks_per_row == 0) g_ticks_per_row = 6;
  g_pce_order_idx = 0;
  g_pce_row_idx = 0;
  g_pce_tick_cnt = 0xFF;
  g_pce_music_playing = 1;
}

void pce_sound_stop(void) {
  pce_sound_init();
}

static unsigned char g_r_track;
static unsigned char *g_r_ptr;
static unsigned char g_r_note, g_r_inst_eff, g_r_param, g_r_inst, g_r_effect, g_r_pce_ch, g_r_left, g_r_right;

static void process_row_channel_cur(void) {
  if (!g_r_ptr)
    return;

  g_r_pce_ch = (g_r_track < 3) ? g_r_track : 4;
  g_r_note = g_r_ptr[g_pce_row_idx * 3 + 0];
  g_r_inst_eff = g_r_ptr[g_pce_row_idx * 3 + 1];
  g_r_param = g_r_ptr[g_pce_row_idx * 3 + 2];

  g_r_inst = (g_r_inst_eff >> 4) & 0x0F;
  g_r_effect = g_r_inst_eff & 0x0F;

  g_fx_type[g_r_track] = g_r_effect;
  g_fx_param[g_r_track] = g_r_param;
  g_fx_delayed_note[g_r_track] = 0xFF;

  /* Tick 0 effects */
  if (g_r_effect == 0x08) {
    /* Set Panning: GB NR51 format (bit 4+t left, bit t right) */
    g_r_left = (g_r_param >> (g_r_track + 4)) & 1;
    g_r_right = (g_r_param >> g_r_track) & 1;
    hw_set_ch(g_r_pce_ch);
    hw_set_pan((g_r_left ? 0xF0 : 0x00) | (g_r_right ? 0x0F : 0x00));
  } else if (g_r_effect == 0x09) {
    /* Set Duty / Waveform */
    if (g_r_track < 2) {
      g_ch_duty[g_r_track] = (g_r_param >> 6) & 0x03;
      for (g_t_i = 0; g_t_i < 32; g_t_i++) {
        g_wave_buf[g_t_i] = g_duty_table[g_ch_duty[g_r_track] * 32 + g_t_i];
      }
      load_wave_ram_ch(g_r_pce_ch);
    }
  } else if (g_r_effect == 0x0B) {
    /* Position Jump */
    g_next_order_idx = g_r_param;
    g_next_row_idx = 0;
    g_has_jump = 1;
  } else if (g_r_effect == 0x0C) {
    /* Set Volume (0..15) */
    g_ch_env_val[g_r_track] = g_r_param & 0x0F;
    g_ch_vol[g_r_track] = ((g_r_param & 0x0F) << 1) | ((g_r_param & 0x0F) > 7 ? 1 : 0);
    hw_set_ch(g_r_pce_ch);
    hw_set_ctrl((g_r_track == 3 ? 0x00 : 0x80) | g_ch_vol[g_r_track]);
  } else if (g_r_effect == 0x0D) {
    /* Pattern Break */
    g_next_order_idx = g_pce_order_idx + 1;
    g_next_row_idx = 0;
    g_has_jump = 1;
  } else if (g_r_effect == 0x0F) {
    /* Set Speed / Tempo */
    if (g_r_param > 0) {
      g_ticks_per_row = g_r_param;
    }
  }

  /* Note Trigger */
  if (g_r_effect == 0x07) {
    /* Note Delay: delay until tick param */
    g_fx_delayed_note[g_r_track] = g_r_note;
    g_fx_delayed_inst[g_r_track] = g_r_inst;
  } else if (g_r_effect == 0x03) {
    /* Tone Portamento: set target period without re-triggering envelope */
    if (g_r_note != 0xFF && g_r_note < 72) {
      g_ch_target_period[g_r_track] = get_track_note_freq(g_r_track, g_r_note);
    }
  } else {
    if (g_r_note != 0xFF) {
      g_t_track = g_r_track;
      g_t_note = g_r_note;
      g_t_inst = g_r_inst;
      trigger_note_core_current();
    }
  }
}

static unsigned char g_eff_t, g_eff_pce_ch, g_eff_fx, g_eff_param, g_eff_arpmode, g_eff_arpoffset, g_eff_note_idx, g_eff_speed, g_eff_depth;
static unsigned short g_eff_freq;
static char g_eff_vib_val;

static void process_tick_effects(unsigned char tick) {
  for (g_eff_t = 0; g_eff_t < 4; g_eff_t++) {
    g_eff_pce_ch = (g_eff_t < 3) ? g_eff_t : 4;
    g_eff_fx = g_fx_type[g_eff_t];
    g_eff_param = g_fx_param[g_eff_t];

    /* Delayed note trigger */
    if (g_eff_fx == 0x07 && tick == g_eff_param && g_fx_delayed_note[g_eff_t] != 0xFF) {
      g_t_track = g_eff_t;
      g_t_note = g_fx_delayed_note[g_eff_t];
      g_t_inst = g_fx_delayed_inst[g_eff_t];
      trigger_note_core_current();
      g_fx_delayed_note[g_eff_t] = 0xFF;
    }

    if (!g_ch_active[g_eff_t])
      continue;

    /* 0xy: Arpeggio (cycles on ticks) */
    if (g_eff_fx == 0x00 && g_eff_param != 0) {
      g_eff_arpmode = tick % 3;
      g_eff_arpoffset = 0;
      if (g_eff_arpmode == 1) g_eff_arpoffset = (g_eff_param >> 4) & 0x0F;
      else if (g_eff_arpmode == 2) g_eff_arpoffset = g_eff_param & 0x0F;

      g_eff_note_idx = g_ch_note[g_eff_t] + g_eff_arpoffset;
      if (g_eff_note_idx < 72) {
        hw_set_ch(g_eff_pce_ch);
        hw_set_freq(get_track_note_freq(g_eff_t, g_eff_note_idx));
      }
    }

    /* 1xy: Portamento Up (Frequency increase = period decrease) */
    else if (g_eff_fx == 0x01 && g_eff_param > 0) {
      if (g_ch_period[g_eff_t] > g_eff_param) g_ch_period[g_eff_t] -= g_eff_param;
      else g_ch_period[g_eff_t] = 1;
      hw_set_ch(g_eff_pce_ch);
      hw_set_freq(g_ch_period[g_eff_t]);
    }

    /* 2xy: Portamento Down (Frequency decrease = period increase) */
    else if (g_eff_fx == 0x02 && g_eff_param > 0) {
      g_ch_period[g_eff_t] += g_eff_param;
      if (g_ch_period[g_eff_t] > 4095) g_ch_period[g_eff_t] = 4095;
      hw_set_ch(g_eff_pce_ch);
      hw_set_freq(g_ch_period[g_eff_t]);
    }

    /* 3xy: Tone Portamento */
    else if (g_eff_fx == 0x03 && g_eff_param > 0) {
      if (g_ch_period[g_eff_t] < g_ch_target_period[g_eff_t]) {
        g_ch_period[g_eff_t] += g_eff_param;
        if (g_ch_period[g_eff_t] > g_ch_target_period[g_eff_t]) g_ch_period[g_eff_t] = g_ch_target_period[g_eff_t];
      } else if (g_ch_period[g_eff_t] > g_ch_target_period[g_eff_t]) {
        if (g_ch_period[g_eff_t] > g_eff_param) g_ch_period[g_eff_t] -= g_eff_param;
        else g_ch_period[g_eff_t] = 0;
        if (g_ch_period[g_eff_t] < g_ch_target_period[g_eff_t]) g_ch_period[g_eff_t] = g_ch_target_period[g_eff_t];
      }
      hw_set_ch(g_eff_pce_ch);
      hw_set_freq(g_ch_period[g_eff_t]);
    }

    /* 4xy: Vibrato */
    else if (g_eff_fx == 0x04 && g_eff_param > 0) {
      g_eff_speed = (g_eff_param >> 4) & 0x0F;
      g_eff_depth = g_eff_param & 0x0F;
      g_fx_vib_phase[g_eff_t] = (g_fx_vib_phase[g_eff_t] + g_eff_speed) & 0x0F;
      g_eff_vib_val = g_vibrato_table[g_fx_vib_phase[g_eff_t]];
      g_eff_freq = (short)g_ch_period[g_eff_t] + ((g_eff_vib_val * g_eff_depth) / 8);
      if (g_eff_freq > 0 && g_eff_freq < 4096) {
        hw_set_ch(g_eff_pce_ch);
        hw_set_freq(g_eff_freq);
      }
    }

    /* Axy: Volume Slide */
    else if (g_eff_fx == 0x0A && g_eff_param > 0) {
      if ((g_eff_param >> 4) > 0) {
        /* Slide Up */
        if (g_ch_env_val[g_eff_t] + (g_eff_param >> 4) <= 15) g_ch_env_val[g_eff_t] += (g_eff_param >> 4);
        else g_ch_env_val[g_eff_t] = 15;
      } else if ((g_eff_param & 0x0F) > 0) {
        /* Slide Down */
        if (g_ch_env_val[g_eff_t] >= (g_eff_param & 0x0F)) g_ch_env_val[g_eff_t] -= (g_eff_param & 0x0F);
        else g_ch_env_val[g_eff_t] = 0;
      }
      g_ch_vol[g_eff_t] = (g_ch_env_val[g_eff_t] << 1) | (g_ch_env_val[g_eff_t] > 7 ? 1 : 0);
      hw_set_ch(g_eff_pce_ch);
      hw_set_ctrl((g_eff_t == 3 ? 0x00 : 0x80) | g_ch_vol[g_eff_t]);
    }

    /* Exy: Note Cut on tick y */
    else if (g_eff_fx == 0x0E && (g_eff_param & 0x0F) == tick) {
      g_ch_vol[g_eff_t] = 0;
      g_ch_active[g_eff_t] = 0;
      hw_set_ch(g_eff_pce_ch);
      hw_set_ctrl((g_eff_t == 3 ? 0x00 : 0x80));
    }
  }
}

static unsigned char *g_u_order_cnt_ptr;
static unsigned char **g_u_order1;
static unsigned char **g_u_order2;
static unsigned char **g_u_order3;
static unsigned char **g_u_order4;
static unsigned char g_u_max_orders;
static unsigned char *g_u_p0, *g_u_p1, *g_u_p2, *g_u_p3;
static unsigned char g_u_pce_ch, g_u_val;
static int g_u_t;

void pce_sound_update(void) {
  if (!g_pce_music_playing || !g_pce_song)
    return;

  /* Handle tick-based envelope decay and note cut on every frame */
  for (g_u_t = 0; g_u_t < 4; g_u_t++) {
    g_u_pce_ch = (g_u_t < 3) ? g_u_t : 4;
    if (g_ch_active[g_u_t]) {
      /* Note length cut */
      if (g_ch_len_enabled[g_u_t]) {
        if (g_ch_len_cnt[g_u_t] > 0) {
          if (g_ch_len_cnt[g_u_t] > 4) {
            g_ch_len_cnt[g_u_t] -= 4;
          } else {
            g_ch_len_cnt[g_u_t] = 0;
            g_ch_vol[g_u_t] = 0;
            g_ch_active[g_u_t] = 0;
            hw_set_ch(g_u_pce_ch);
            hw_set_ctrl((g_u_t == 3) ? 0x00 : 0x80);
            continue;
          }
        }
      }

      /* Volume envelope step */
      if (g_ch_env_step[g_u_t] > 0) {
        g_ch_env_timer[g_u_t]++;
        if (g_ch_env_timer[g_u_t] >= g_ch_env_step[g_u_t]) {
          g_ch_env_timer[g_u_t] = 0;
          if (g_ch_env_dir[g_u_t] == 0) {
            /* Decay */
            if (g_ch_env_val[g_u_t] > 0) {
              g_ch_env_val[g_u_t]--;
              g_u_val = g_ch_env_val[g_u_t];
              g_ch_vol[g_u_t] = (g_u_val << 1) | (g_u_val > 7 ? 1 : 0);
              hw_set_ch(g_u_pce_ch);
              hw_set_ctrl((g_u_t == 3 ? 0x00 : 0x80) | g_ch_vol[g_u_t]);
            } else {
              g_ch_vol[g_u_t] = 0;
              g_ch_active[g_u_t] = 0;
              hw_set_ch(g_u_pce_ch);
              hw_set_ctrl((g_u_t == 3) ? 0x00 : 0x80);
            }
          } else {
            /* Increase */
            if (g_ch_env_val[g_u_t] < 15) {
              g_ch_env_val[g_u_t]++;
              g_u_val = g_ch_env_val[g_u_t];
              g_ch_vol[g_u_t] = (g_u_val << 1) | (g_u_val > 7 ? 1 : 0);
              hw_set_ch(g_u_pce_ch);
              hw_set_ctrl((g_u_t == 3 ? 0x00 : 0x80) | g_ch_vol[g_u_t]);
            }
          }
        }
      }
    }
  }

  if (g_pce_tick_cnt != 0xFF) {
    g_pce_tick_cnt++;
    if (g_pce_tick_cnt < g_ticks_per_row) {
      process_tick_effects(g_pce_tick_cnt);
      return;
    }
  }
  g_pce_tick_cnt = 0;

  g_u_order_cnt_ptr = (unsigned char *)(g_pce_song[1]);
  g_u_max_orders = (*g_u_order_cnt_ptr) / 2;

  g_u_order1 = (unsigned char **)(g_pce_song[2]);
  g_u_order2 = (unsigned char **)(g_pce_song[3]);
  g_u_order3 = (unsigned char **)(g_pce_song[4]);
  g_u_order4 = (unsigned char **)(g_pce_song[5]);

  g_u_p0 = g_u_order1[g_pce_order_idx];
  g_u_p1 = g_u_order2[g_pce_order_idx];
  g_u_p2 = g_u_order3[g_pce_order_idx];
  g_u_p3 = g_u_order4[g_pce_order_idx];

  g_has_jump = 0;
  g_r_track = 0;
  g_r_ptr = g_u_p0;
  process_row_channel_cur();

  g_r_track = 1;
  g_r_ptr = g_u_p1;
  process_row_channel_cur();

  g_r_track = 2;
  g_r_ptr = g_u_p2;
  process_row_channel_cur();

  g_r_track = 3;
  g_r_ptr = g_u_p3;
  process_row_channel_cur();

  if (g_has_jump) {
    g_pce_order_idx = g_next_order_idx;
    g_pce_row_idx = g_next_row_idx;
    if (g_pce_order_idx >= g_u_max_orders) {
      g_pce_order_idx = 0;
    }
  } else {
    g_pce_row_idx++;
    if (g_pce_row_idx >= 64) {
      g_pce_row_idx = 0;
      g_pce_order_idx++;
      if (g_pce_order_idx >= g_u_max_orders) {
        g_pce_order_idx = 0;
      }
    }
  }
}

