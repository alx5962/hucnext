#include "include/engine.h"
#include "include/pce_sound.h"

void show_dialogue(const char *msg);
void hide_dialogue(void);

int g_script_scene = 0;
int g_script_step = -1;
int g_wait_timer = 0;

#ifndef HAS_SCENE_STEP_EVENTS
int run_scene_step(int scene_num, int step) {
  (void)scene_num;
  (void)step;
  return -1;
}
#endif

#ifndef PLAYER_START_X
#define PLAYER_START_X 104
#endif

#ifndef PLAYER_START_Y
#define PLAYER_START_Y 112
#endif

int g_current_scene = 1;
int g_current_scene_type = SCENE_1_TYPE;
int g_player_spr_vram_size = 0x40;
int g_player_spr_size = SZ_16x16;

int g_plat_sub_x = 0;
int g_plat_sub_y = 0;
int g_plat_vy = 0;
int g_plat_on_ground = 0;
int g_shmup_scroll_x = 0;

void load_scene_part1(int scene_num) {
  if (scene_num == 1) {
    g_current_scene_type = SCENE_1_TYPE;
    load_background(bg_scene1_chr, bg_scene1_pal, bg_scene1_bat, 32, 28);
    collision_init(scene_1_collisions, 32, 28);

#ifdef ACTOR_SCENE_1_PLAYER_HIDDEN
    actor_hide(0);
#endif

#ifdef HAS_ACTOR_SCENE_1_1
    load_vram(0x5400, actor_sc1_1_spr, ACTOR_SCENE_1_1_VRAM_SIZE);
    load_palette(17, actor_sc1_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_1_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_1_1_X, ACTOR_SCENE_1_1_Y);
#ifdef ACTOR_SCENE_1_1_HIDDEN
      actor_hide(1);
#endif
    }
#else
#ifdef HAS_ACTOR_SCENE_1
    load_vram(0x5400, actor_sc1_spr, ACTOR_SCENE_1_VRAM_SIZE);
    load_palette(17, actor_sc1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_1_X, ACTOR_SCENE_1_Y);
#ifdef ACTOR_SCENE_1_HIDDEN
      actor_hide(1);
#endif
    }
#endif
#endif

#ifdef HAS_ACTOR_SCENE_1_2
    load_vram(0x5600, actor_sc1_2_spr, ACTOR_SCENE_1_2_VRAM_SIZE);
    load_palette(18, actor_sc1_2_pal, 1);
    if (g_actor_count > 2) {
      g_actor_active[2] = 1;
      g_actor_tile_id[2] = 0x5600;
      g_actor_palette[2] = 2;
      g_actor_size[2] = ACTOR_SCENE_1_2_SPRITE_SIZE;
      actor_set_pos(2, ACTOR_SCENE_1_2_X, ACTOR_SCENE_1_2_Y);
#ifdef ACTOR_SCENE_1_2_HIDDEN
      actor_hide(2);
#endif
    }
#endif
  }

#ifdef HAS_SCENE_2
  else if (scene_num == 2) {
#ifdef SCENE_2_TYPE
    g_current_scene_type = SCENE_2_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene2_chr, bg_scene2_pal, bg_scene2_bat, 32, 28);
#ifdef HAS_SCENE_2_COLLISIONS
    collision_init(scene_2_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_2_1
    load_vram(0x5400, actor_sc2_1_spr, ACTOR_SCENE_2_1_VRAM_SIZE);
    load_palette(17, actor_sc2_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_2_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_2_1_X, ACTOR_SCENE_2_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_3
  else if (scene_num == 3) {
#ifdef SCENE_3_TYPE
    g_current_scene_type = SCENE_3_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene3_chr, bg_scene3_pal, bg_scene3_bat, 32, 28);
#ifdef HAS_SCENE_3_COLLISIONS
    collision_init(scene_3_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_3_1
    load_vram(0x5400, actor_sc3_1_spr, ACTOR_SCENE_3_1_VRAM_SIZE);
    load_palette(17, actor_sc3_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_3_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_3_1_X, ACTOR_SCENE_3_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_4
  else if (scene_num == 4) {
#ifdef SCENE_4_TYPE
    g_current_scene_type = SCENE_4_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene4_chr, bg_scene4_pal, bg_scene4_bat, 32, 28);
#ifdef HAS_SCENE_4_COLLISIONS
    collision_init(scene_4_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_4_1
    load_vram(0x5400, actor_sc4_1_spr, ACTOR_SCENE_4_1_VRAM_SIZE);
    load_palette(17, actor_sc4_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_4_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_4_1_X, ACTOR_SCENE_4_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_5
  else if (scene_num == 5) {
#ifdef SCENE_5_TYPE
    g_current_scene_type = SCENE_5_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene5_chr, bg_scene5_pal, bg_scene5_bat, 32, 28);
#ifdef HAS_SCENE_5_COLLISIONS
    collision_init(scene_5_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_5_1
    load_vram(0x5400, actor_sc5_1_spr, ACTOR_SCENE_5_1_VRAM_SIZE);
    load_palette(17, actor_sc5_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_5_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_5_1_X, ACTOR_SCENE_5_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_6
  else if (scene_num == 6) {
#ifdef SCENE_6_TYPE
    g_current_scene_type = SCENE_6_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene6_chr, bg_scene6_pal, bg_scene6_bat, 32, 28);
#ifdef HAS_SCENE_6_COLLISIONS
    collision_init(scene_6_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_6_1
    load_vram(0x5400, actor_sc6_1_spr, ACTOR_SCENE_6_1_VRAM_SIZE);
    load_palette(17, actor_sc6_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_6_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_6_1_X, ACTOR_SCENE_6_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_7
  else if (scene_num == 7) {
#ifdef SCENE_7_TYPE
    g_current_scene_type = SCENE_7_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene7_chr, bg_scene7_pal, bg_scene7_bat, 32, 28);
#ifdef HAS_SCENE_7_COLLISIONS
    collision_init(scene_7_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_7_1
    load_vram(0x5400, actor_sc7_1_spr, ACTOR_SCENE_7_1_VRAM_SIZE);
    load_palette(17, actor_sc7_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_7_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_7_1_X, ACTOR_SCENE_7_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_8
  else if (scene_num == 8) {
#ifdef SCENE_8_TYPE
    g_current_scene_type = SCENE_8_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene8_chr, bg_scene8_pal, bg_scene8_bat, 32, 28);
#ifdef HAS_SCENE_8_COLLISIONS
    collision_init(scene_8_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_8_1
    load_vram(0x5400, actor_sc8_1_spr, ACTOR_SCENE_8_1_VRAM_SIZE);
    load_palette(17, actor_sc8_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_8_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_8_1_X, ACTOR_SCENE_8_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_9
  else if (scene_num == 9) {
#ifdef SCENE_9_TYPE
    g_current_scene_type = SCENE_9_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene9_chr, bg_scene9_pal, bg_scene9_bat, 32, 28);
#ifdef HAS_SCENE_9_COLLISIONS
    collision_init(scene_9_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_9_1
    load_vram(0x5400, actor_sc9_1_spr, ACTOR_SCENE_9_1_VRAM_SIZE);
    load_palette(17, actor_sc9_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_9_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_9_1_X, ACTOR_SCENE_9_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_10
  else if (scene_num == 10) {
#ifdef SCENE_10_TYPE
    g_current_scene_type = SCENE_10_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene10_chr, bg_scene10_pal, bg_scene10_bat, 32, 28);
#ifdef HAS_SCENE_10_COLLISIONS
    collision_init(scene_10_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_10_1
    load_vram(0x5400, actor_sc10_1_spr, ACTOR_SCENE_10_1_VRAM_SIZE);
    load_palette(17, actor_sc10_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_10_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_10_1_X, ACTOR_SCENE_10_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_11
  else if (scene_num == 11) {
#ifdef SCENE_11_TYPE
    g_current_scene_type = SCENE_11_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene11_chr, bg_scene11_pal, bg_scene11_bat, 32, 28);
#ifdef HAS_SCENE_11_COLLISIONS
    collision_init(scene_11_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_11_1
    load_vram(0x5400, actor_sc11_1_spr, ACTOR_SCENE_11_1_VRAM_SIZE);
    load_palette(17, actor_sc11_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_11_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_11_1_X, ACTOR_SCENE_11_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_12
  else if (scene_num == 12) {
#ifdef SCENE_12_TYPE
    g_current_scene_type = SCENE_12_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene12_chr, bg_scene12_pal, bg_scene12_bat, 32, 28);
#ifdef HAS_SCENE_12_COLLISIONS
    collision_init(scene_12_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_12_1
    load_vram(0x5400, actor_sc12_1_spr, ACTOR_SCENE_12_1_VRAM_SIZE);
    load_palette(17, actor_sc12_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_12_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_12_1_X, ACTOR_SCENE_12_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_13
  else if (scene_num == 13) {
#ifdef SCENE_13_TYPE
    g_current_scene_type = SCENE_13_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene13_chr, bg_scene13_pal, bg_scene13_bat, 32, 28);
#ifdef HAS_SCENE_13_COLLISIONS
    collision_init(scene_13_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_13_1
    load_vram(0x5400, actor_sc13_1_spr, ACTOR_SCENE_13_1_VRAM_SIZE);
    load_palette(17, actor_sc13_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_13_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_13_1_X, ACTOR_SCENE_13_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_14
  else if (scene_num == 14) {
#ifdef SCENE_14_TYPE
    g_current_scene_type = SCENE_14_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene14_chr, bg_scene14_pal, bg_scene14_bat, 32, 28);
#ifdef HAS_SCENE_14_COLLISIONS
    collision_init(scene_14_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_14_1
    load_vram(0x5400, actor_sc14_1_spr, ACTOR_SCENE_14_1_VRAM_SIZE);
    load_palette(17, actor_sc14_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_14_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_14_1_X, ACTOR_SCENE_14_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_15
  else if (scene_num == 15) {
#ifdef SCENE_15_TYPE
    g_current_scene_type = SCENE_15_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene15_chr, bg_scene15_pal, bg_scene15_bat, 32, 28);
#ifdef HAS_SCENE_15_COLLISIONS
    collision_init(scene_15_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_15_1
    load_vram(0x5400, actor_sc15_1_spr, ACTOR_SCENE_15_1_VRAM_SIZE);
    load_palette(17, actor_sc15_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_15_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_15_1_X, ACTOR_SCENE_15_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_16
  else if (scene_num == 16) {
#ifdef SCENE_16_TYPE
    g_current_scene_type = SCENE_16_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene16_chr, bg_scene16_pal, bg_scene16_bat, 32, 28);
#ifdef HAS_SCENE_16_COLLISIONS
    collision_init(scene_16_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_16_1
    load_vram(0x5400, actor_sc16_1_spr, ACTOR_SCENE_16_1_VRAM_SIZE);
    load_palette(17, actor_sc16_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_16_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_16_1_X, ACTOR_SCENE_16_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_17
  else if (scene_num == 17) {
#ifdef SCENE_17_TYPE
    g_current_scene_type = SCENE_17_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene17_chr, bg_scene17_pal, bg_scene17_bat, 32, 28);
#ifdef HAS_SCENE_17_COLLISIONS
    collision_init(scene_17_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_17_1
    load_vram(0x5400, actor_sc17_1_spr, ACTOR_SCENE_17_1_VRAM_SIZE);
    load_palette(17, actor_sc17_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_17_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_17_1_X, ACTOR_SCENE_17_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_18
  else if (scene_num == 18) {
#ifdef SCENE_18_TYPE
    g_current_scene_type = SCENE_18_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene18_chr, bg_scene18_pal, bg_scene18_bat, 32, 28);
#ifdef HAS_SCENE_18_COLLISIONS
    collision_init(scene_18_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_18_1
    load_vram(0x5400, actor_sc18_1_spr, ACTOR_SCENE_18_1_VRAM_SIZE);
    load_palette(17, actor_sc18_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_18_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_18_1_X, ACTOR_SCENE_18_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_19
  else if (scene_num == 19) {
#ifdef SCENE_19_TYPE
    g_current_scene_type = SCENE_19_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene19_chr, bg_scene19_pal, bg_scene19_bat, 32, 28);
#ifdef HAS_SCENE_19_COLLISIONS
    collision_init(scene_19_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_19_1
    load_vram(0x5400, actor_sc19_1_spr, ACTOR_SCENE_19_1_VRAM_SIZE);
    load_palette(17, actor_sc19_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_19_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_19_1_X, ACTOR_SCENE_19_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_20
  else if (scene_num == 20) {
#ifdef SCENE_20_TYPE
    g_current_scene_type = SCENE_20_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene20_chr, bg_scene20_pal, bg_scene20_bat, 32, 28);
#ifdef HAS_SCENE_20_COLLISIONS
    collision_init(scene_20_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_20_1
    load_vram(0x5400, actor_sc20_1_spr, ACTOR_SCENE_20_1_VRAM_SIZE);
    load_palette(17, actor_sc20_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_20_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_20_1_X, ACTOR_SCENE_20_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_21
  else if (scene_num == 21) {
#ifdef SCENE_21_TYPE
    g_current_scene_type = SCENE_21_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene21_chr, bg_scene21_pal, bg_scene21_bat, 32, 28);
#ifdef HAS_SCENE_21_COLLISIONS
    collision_init(scene_21_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_21_1
    load_vram(0x5400, actor_sc21_1_spr, ACTOR_SCENE_21_1_VRAM_SIZE);
    load_palette(17, actor_sc21_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_21_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_21_1_X, ACTOR_SCENE_21_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_22
  else if (scene_num == 22) {
#ifdef SCENE_22_TYPE
    g_current_scene_type = SCENE_22_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene22_chr, bg_scene22_pal, bg_scene22_bat, 32, 28);
#ifdef HAS_SCENE_22_COLLISIONS
    collision_init(scene_22_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_22_1
    load_vram(0x5400, actor_sc22_1_spr, ACTOR_SCENE_22_1_VRAM_SIZE);
    load_palette(17, actor_sc22_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_22_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_22_1_X, ACTOR_SCENE_22_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_23
  else if (scene_num == 23) {
#ifdef SCENE_23_TYPE
    g_current_scene_type = SCENE_23_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene23_chr, bg_scene23_pal, bg_scene23_bat, 32, 28);
#ifdef HAS_SCENE_23_COLLISIONS
    collision_init(scene_23_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_23_1
    load_vram(0x5400, actor_sc23_1_spr, ACTOR_SCENE_23_1_VRAM_SIZE);
    load_palette(17, actor_sc23_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_23_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_23_1_X, ACTOR_SCENE_23_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_24
  else if (scene_num == 24) {
#ifdef SCENE_24_TYPE
    g_current_scene_type = SCENE_24_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene24_chr, bg_scene24_pal, bg_scene24_bat, 32, 28);
#ifdef HAS_SCENE_24_COLLISIONS
    collision_init(scene_24_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_24_1
    load_vram(0x5400, actor_sc24_1_spr, ACTOR_SCENE_24_1_VRAM_SIZE);
    load_palette(17, actor_sc24_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_24_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_24_1_X, ACTOR_SCENE_24_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_25
  else if (scene_num == 25) {
#ifdef SCENE_25_TYPE
    g_current_scene_type = SCENE_25_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene25_chr, bg_scene25_pal, bg_scene25_bat, 32, 28);
#ifdef HAS_SCENE_25_COLLISIONS
    collision_init(scene_25_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_25_1
    load_vram(0x5400, actor_sc25_1_spr, ACTOR_SCENE_25_1_VRAM_SIZE);
    load_palette(17, actor_sc25_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_25_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_25_1_X, ACTOR_SCENE_25_1_Y);
    }
#endif
  }
#endif

}

void load_scene_part2(int scene_num) {
#ifdef HAS_SCENE_26
  if (scene_num == 26) {
#ifdef SCENE_26_TYPE
    g_current_scene_type = SCENE_26_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene26_chr, bg_scene26_pal, bg_scene26_bat, 32, 28);
#ifdef HAS_SCENE_26_COLLISIONS
    collision_init(scene_26_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_26_1
    load_vram(0x5400, actor_sc26_1_spr, ACTOR_SCENE_26_1_VRAM_SIZE);
    load_palette(17, actor_sc26_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_26_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_26_1_X, ACTOR_SCENE_26_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_27
  else if (scene_num == 27) {
#ifdef SCENE_27_TYPE
    g_current_scene_type = SCENE_27_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene27_chr, bg_scene27_pal, bg_scene27_bat, 32, 28);
#ifdef HAS_SCENE_27_COLLISIONS
    collision_init(scene_27_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_27_1
    load_vram(0x5400, actor_sc27_1_spr, ACTOR_SCENE_27_1_VRAM_SIZE);
    load_palette(17, actor_sc27_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_27_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_27_1_X, ACTOR_SCENE_27_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_28
  else if (scene_num == 28) {
#ifdef SCENE_28_TYPE
    g_current_scene_type = SCENE_28_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene28_chr, bg_scene28_pal, bg_scene28_bat, 32, 28);
#ifdef HAS_SCENE_28_COLLISIONS
    collision_init(scene_28_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_28_1
    load_vram(0x5400, actor_sc28_1_spr, ACTOR_SCENE_28_1_VRAM_SIZE);
    load_palette(17, actor_sc28_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_28_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_28_1_X, ACTOR_SCENE_28_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_29
  else if (scene_num == 29) {
#ifdef SCENE_29_TYPE
    g_current_scene_type = SCENE_29_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene29_chr, bg_scene29_pal, bg_scene29_bat, 32, 28);
#ifdef HAS_SCENE_29_COLLISIONS
    collision_init(scene_29_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_29_1
    load_vram(0x5400, actor_sc29_1_spr, ACTOR_SCENE_29_1_VRAM_SIZE);
    load_palette(17, actor_sc29_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_29_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_29_1_X, ACTOR_SCENE_29_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_30
  else if (scene_num == 30) {
#ifdef SCENE_30_TYPE
    g_current_scene_type = SCENE_30_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene30_chr, bg_scene30_pal, bg_scene30_bat, 32, 28);
#ifdef HAS_SCENE_30_COLLISIONS
    collision_init(scene_30_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_30_1
    load_vram(0x5400, actor_sc30_1_spr, ACTOR_SCENE_30_1_VRAM_SIZE);
    load_palette(17, actor_sc30_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_30_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_30_1_X, ACTOR_SCENE_30_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_31
  else if (scene_num == 31) {
#ifdef SCENE_31_TYPE
    g_current_scene_type = SCENE_31_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene31_chr, bg_scene31_pal, bg_scene31_bat, 32, 28);
#ifdef HAS_SCENE_31_COLLISIONS
    collision_init(scene_31_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_31_1
    load_vram(0x5400, actor_sc31_1_spr, ACTOR_SCENE_31_1_VRAM_SIZE);
    load_palette(17, actor_sc31_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_31_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_31_1_X, ACTOR_SCENE_31_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_32
  else if (scene_num == 32) {
#ifdef SCENE_32_TYPE
    g_current_scene_type = SCENE_32_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene32_chr, bg_scene32_pal, bg_scene32_bat, 32, 28);
#ifdef HAS_SCENE_32_COLLISIONS
    collision_init(scene_32_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_32_1
    load_vram(0x5400, actor_sc32_1_spr, ACTOR_SCENE_32_1_VRAM_SIZE);
    load_palette(17, actor_sc32_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_32_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_32_1_X, ACTOR_SCENE_32_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_33
  else if (scene_num == 33) {
#ifdef SCENE_33_TYPE
    g_current_scene_type = SCENE_33_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene33_chr, bg_scene33_pal, bg_scene33_bat, 32, 28);
#ifdef HAS_SCENE_33_COLLISIONS
    collision_init(scene_33_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_33_1
    load_vram(0x5400, actor_sc33_1_spr, ACTOR_SCENE_33_1_VRAM_SIZE);
    load_palette(17, actor_sc33_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_33_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_33_1_X, ACTOR_SCENE_33_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_34
  else if (scene_num == 34) {
#ifdef SCENE_34_TYPE
    g_current_scene_type = SCENE_34_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene34_chr, bg_scene34_pal, bg_scene34_bat, 32, 28);
#ifdef HAS_SCENE_34_COLLISIONS
    collision_init(scene_34_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_34_1
    load_vram(0x5400, actor_sc34_1_spr, ACTOR_SCENE_34_1_VRAM_SIZE);
    load_palette(17, actor_sc34_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_34_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_34_1_X, ACTOR_SCENE_34_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_35
  else if (scene_num == 35) {
#ifdef SCENE_35_TYPE
    g_current_scene_type = SCENE_35_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene35_chr, bg_scene35_pal, bg_scene35_bat, 32, 28);
#ifdef HAS_SCENE_35_COLLISIONS
    collision_init(scene_35_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_35_1
    load_vram(0x5400, actor_sc35_1_spr, ACTOR_SCENE_35_1_VRAM_SIZE);
    load_palette(17, actor_sc35_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_35_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_35_1_X, ACTOR_SCENE_35_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_36
  else if (scene_num == 36) {
#ifdef SCENE_36_TYPE
    g_current_scene_type = SCENE_36_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene36_chr, bg_scene36_pal, bg_scene36_bat, 32, 28);
#ifdef HAS_SCENE_36_COLLISIONS
    collision_init(scene_36_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_36_1
    load_vram(0x5400, actor_sc36_1_spr, ACTOR_SCENE_36_1_VRAM_SIZE);
    load_palette(17, actor_sc36_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_36_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_36_1_X, ACTOR_SCENE_36_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_37
  else if (scene_num == 37) {
#ifdef SCENE_37_TYPE
    g_current_scene_type = SCENE_37_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene37_chr, bg_scene37_pal, bg_scene37_bat, 32, 28);
#ifdef HAS_SCENE_37_COLLISIONS
    collision_init(scene_37_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_37_1
    load_vram(0x5400, actor_sc37_1_spr, ACTOR_SCENE_37_1_VRAM_SIZE);
    load_palette(17, actor_sc37_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_37_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_37_1_X, ACTOR_SCENE_37_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_38
  else if (scene_num == 38) {
#ifdef SCENE_38_TYPE
    g_current_scene_type = SCENE_38_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene38_chr, bg_scene38_pal, bg_scene38_bat, 32, 28);
#ifdef HAS_SCENE_38_COLLISIONS
    collision_init(scene_38_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_38_1
    load_vram(0x5400, actor_sc38_1_spr, ACTOR_SCENE_38_1_VRAM_SIZE);
    load_palette(17, actor_sc38_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_38_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_38_1_X, ACTOR_SCENE_38_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_39
  else if (scene_num == 39) {
#ifdef SCENE_39_TYPE
    g_current_scene_type = SCENE_39_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene39_chr, bg_scene39_pal, bg_scene39_bat, 32, 28);
#ifdef HAS_SCENE_39_COLLISIONS
    collision_init(scene_39_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_39_1
    load_vram(0x5400, actor_sc39_1_spr, ACTOR_SCENE_39_1_VRAM_SIZE);
    load_palette(17, actor_sc39_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_39_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_39_1_X, ACTOR_SCENE_39_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_40
  else if (scene_num == 40) {
#ifdef SCENE_40_TYPE
    g_current_scene_type = SCENE_40_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene40_chr, bg_scene40_pal, bg_scene40_bat, 32, 28);
#ifdef HAS_SCENE_40_COLLISIONS
    collision_init(scene_40_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_40_1
    load_vram(0x5400, actor_sc40_1_spr, ACTOR_SCENE_40_1_VRAM_SIZE);
    load_palette(17, actor_sc40_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_40_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_40_1_X, ACTOR_SCENE_40_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_41
  else if (scene_num == 41) {
#ifdef SCENE_41_TYPE
    g_current_scene_type = SCENE_41_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene41_chr, bg_scene41_pal, bg_scene41_bat, 32, 28);
#ifdef HAS_SCENE_41_COLLISIONS
    collision_init(scene_41_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_41_1
    load_vram(0x5400, actor_sc41_1_spr, ACTOR_SCENE_41_1_VRAM_SIZE);
    load_palette(17, actor_sc41_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_41_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_41_1_X, ACTOR_SCENE_41_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_42
  else if (scene_num == 42) {
#ifdef SCENE_42_TYPE
    g_current_scene_type = SCENE_42_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene42_chr, bg_scene42_pal, bg_scene42_bat, 32, 28);
#ifdef HAS_SCENE_42_COLLISIONS
    collision_init(scene_42_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_42_1
    load_vram(0x5400, actor_sc42_1_spr, ACTOR_SCENE_42_1_VRAM_SIZE);
    load_palette(17, actor_sc42_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_42_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_42_1_X, ACTOR_SCENE_42_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_43
  else if (scene_num == 43) {
#ifdef SCENE_43_TYPE
    g_current_scene_type = SCENE_43_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene43_chr, bg_scene43_pal, bg_scene43_bat, 32, 28);
#ifdef HAS_SCENE_43_COLLISIONS
    collision_init(scene_43_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_43_1
    load_vram(0x5400, actor_sc43_1_spr, ACTOR_SCENE_43_1_VRAM_SIZE);
    load_palette(17, actor_sc43_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_43_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_43_1_X, ACTOR_SCENE_43_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_44
  else if (scene_num == 44) {
#ifdef SCENE_44_TYPE
    g_current_scene_type = SCENE_44_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene44_chr, bg_scene44_pal, bg_scene44_bat, 32, 28);
#ifdef HAS_SCENE_44_COLLISIONS
    collision_init(scene_44_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_44_1
    load_vram(0x5400, actor_sc44_1_spr, ACTOR_SCENE_44_1_VRAM_SIZE);
    load_palette(17, actor_sc44_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_44_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_44_1_X, ACTOR_SCENE_44_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_45
  else if (scene_num == 45) {
#ifdef SCENE_45_TYPE
    g_current_scene_type = SCENE_45_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene45_chr, bg_scene45_pal, bg_scene45_bat, 32, 28);
#ifdef HAS_SCENE_45_COLLISIONS
    collision_init(scene_45_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_45_1
    load_vram(0x5400, actor_sc45_1_spr, ACTOR_SCENE_45_1_VRAM_SIZE);
    load_palette(17, actor_sc45_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_45_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_45_1_X, ACTOR_SCENE_45_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_46
  else if (scene_num == 46) {
#ifdef SCENE_46_TYPE
    g_current_scene_type = SCENE_46_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene46_chr, bg_scene46_pal, bg_scene46_bat, 32, 28);
#ifdef HAS_SCENE_46_COLLISIONS
    collision_init(scene_46_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_46_1
    load_vram(0x5400, actor_sc46_1_spr, ACTOR_SCENE_46_1_VRAM_SIZE);
    load_palette(17, actor_sc46_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_46_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_46_1_X, ACTOR_SCENE_46_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_47
  else if (scene_num == 47) {
#ifdef SCENE_47_TYPE
    g_current_scene_type = SCENE_47_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene47_chr, bg_scene47_pal, bg_scene47_bat, 32, 28);
#ifdef HAS_SCENE_47_COLLISIONS
    collision_init(scene_47_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_47_1
    load_vram(0x5400, actor_sc47_1_spr, ACTOR_SCENE_47_1_VRAM_SIZE);
    load_palette(17, actor_sc47_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_47_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_47_1_X, ACTOR_SCENE_47_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_48
  else if (scene_num == 48) {
#ifdef SCENE_48_TYPE
    g_current_scene_type = SCENE_48_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene48_chr, bg_scene48_pal, bg_scene48_bat, 32, 28);
#ifdef HAS_SCENE_48_COLLISIONS
    collision_init(scene_48_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_48_1
    load_vram(0x5400, actor_sc48_1_spr, ACTOR_SCENE_48_1_VRAM_SIZE);
    load_palette(17, actor_sc48_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_48_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_48_1_X, ACTOR_SCENE_48_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_49
  else if (scene_num == 49) {
#ifdef SCENE_49_TYPE
    g_current_scene_type = SCENE_49_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene49_chr, bg_scene49_pal, bg_scene49_bat, 32, 28);
#ifdef HAS_SCENE_49_COLLISIONS
    collision_init(scene_49_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_49_1
    load_vram(0x5400, actor_sc49_1_spr, ACTOR_SCENE_49_1_VRAM_SIZE);
    load_palette(17, actor_sc49_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_49_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_49_1_X, ACTOR_SCENE_49_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_50
  else if (scene_num == 50) {
#ifdef SCENE_50_TYPE
    g_current_scene_type = SCENE_50_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene50_chr, bg_scene50_pal, bg_scene50_bat, 32, 28);
#ifdef HAS_SCENE_50_COLLISIONS
    collision_init(scene_50_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_50_1
    load_vram(0x5400, actor_sc50_1_spr, ACTOR_SCENE_50_1_VRAM_SIZE);
    load_palette(17, actor_sc50_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_50_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_50_1_X, ACTOR_SCENE_50_1_Y);
    }
#endif
  }
#endif

}

void load_scene_part3(int scene_num) {
#ifdef HAS_SCENE_51
  if (scene_num == 51) {
#ifdef SCENE_51_TYPE
    g_current_scene_type = SCENE_51_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene51_chr, bg_scene51_pal, bg_scene51_bat, 32, 28);
#ifdef HAS_SCENE_51_COLLISIONS
    collision_init(scene_51_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_51_1
    load_vram(0x5400, actor_sc51_1_spr, ACTOR_SCENE_51_1_VRAM_SIZE);
    load_palette(17, actor_sc51_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_51_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_51_1_X, ACTOR_SCENE_51_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_52
  else if (scene_num == 52) {
#ifdef SCENE_52_TYPE
    g_current_scene_type = SCENE_52_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene52_chr, bg_scene52_pal, bg_scene52_bat, 32, 28);
#ifdef HAS_SCENE_52_COLLISIONS
    collision_init(scene_52_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_52_1
    load_vram(0x5400, actor_sc52_1_spr, ACTOR_SCENE_52_1_VRAM_SIZE);
    load_palette(17, actor_sc52_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_52_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_52_1_X, ACTOR_SCENE_52_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_53
  else if (scene_num == 53) {
#ifdef SCENE_53_TYPE
    g_current_scene_type = SCENE_53_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene53_chr, bg_scene53_pal, bg_scene53_bat, 32, 28);
#ifdef HAS_SCENE_53_COLLISIONS
    collision_init(scene_53_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_53_1
    load_vram(0x5400, actor_sc53_1_spr, ACTOR_SCENE_53_1_VRAM_SIZE);
    load_palette(17, actor_sc53_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_53_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_53_1_X, ACTOR_SCENE_53_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_54
  else if (scene_num == 54) {
#ifdef SCENE_54_TYPE
    g_current_scene_type = SCENE_54_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene54_chr, bg_scene54_pal, bg_scene54_bat, 32, 28);
#ifdef HAS_SCENE_54_COLLISIONS
    collision_init(scene_54_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_54_1
    load_vram(0x5400, actor_sc54_1_spr, ACTOR_SCENE_54_1_VRAM_SIZE);
    load_palette(17, actor_sc54_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_54_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_54_1_X, ACTOR_SCENE_54_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_55
  else if (scene_num == 55) {
#ifdef SCENE_55_TYPE
    g_current_scene_type = SCENE_55_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene55_chr, bg_scene55_pal, bg_scene55_bat, 32, 28);
#ifdef HAS_SCENE_55_COLLISIONS
    collision_init(scene_55_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_55_1
    load_vram(0x5400, actor_sc55_1_spr, ACTOR_SCENE_55_1_VRAM_SIZE);
    load_palette(17, actor_sc55_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_55_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_55_1_X, ACTOR_SCENE_55_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_56
  else if (scene_num == 56) {
#ifdef SCENE_56_TYPE
    g_current_scene_type = SCENE_56_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene56_chr, bg_scene56_pal, bg_scene56_bat, 32, 28);
#ifdef HAS_SCENE_56_COLLISIONS
    collision_init(scene_56_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_56_1
    load_vram(0x5400, actor_sc56_1_spr, ACTOR_SCENE_56_1_VRAM_SIZE);
    load_palette(17, actor_sc56_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_56_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_56_1_X, ACTOR_SCENE_56_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_57
  else if (scene_num == 57) {
#ifdef SCENE_57_TYPE
    g_current_scene_type = SCENE_57_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene57_chr, bg_scene57_pal, bg_scene57_bat, 32, 28);
#ifdef HAS_SCENE_57_COLLISIONS
    collision_init(scene_57_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_57_1
    load_vram(0x5400, actor_sc57_1_spr, ACTOR_SCENE_57_1_VRAM_SIZE);
    load_palette(17, actor_sc57_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_57_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_57_1_X, ACTOR_SCENE_57_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_58
  else if (scene_num == 58) {
#ifdef SCENE_58_TYPE
    g_current_scene_type = SCENE_58_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene58_chr, bg_scene58_pal, bg_scene58_bat, 32, 28);
#ifdef HAS_SCENE_58_COLLISIONS
    collision_init(scene_58_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_58_1
    load_vram(0x5400, actor_sc58_1_spr, ACTOR_SCENE_58_1_VRAM_SIZE);
    load_palette(17, actor_sc58_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_58_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_58_1_X, ACTOR_SCENE_58_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_59
  else if (scene_num == 59) {
#ifdef SCENE_59_TYPE
    g_current_scene_type = SCENE_59_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene59_chr, bg_scene59_pal, bg_scene59_bat, 32, 28);
#ifdef HAS_SCENE_59_COLLISIONS
    collision_init(scene_59_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_59_1
    load_vram(0x5400, actor_sc59_1_spr, ACTOR_SCENE_59_1_VRAM_SIZE);
    load_palette(17, actor_sc59_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_59_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_59_1_X, ACTOR_SCENE_59_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_60
  else if (scene_num == 60) {
#ifdef SCENE_60_TYPE
    g_current_scene_type = SCENE_60_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene60_chr, bg_scene60_pal, bg_scene60_bat, 32, 28);
#ifdef HAS_SCENE_60_COLLISIONS
    collision_init(scene_60_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_60_1
    load_vram(0x5400, actor_sc60_1_spr, ACTOR_SCENE_60_1_VRAM_SIZE);
    load_palette(17, actor_sc60_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_60_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_60_1_X, ACTOR_SCENE_60_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_61
  else if (scene_num == 61) {
#ifdef SCENE_61_TYPE
    g_current_scene_type = SCENE_61_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene61_chr, bg_scene61_pal, bg_scene61_bat, 32, 28);
#ifdef HAS_SCENE_61_COLLISIONS
    collision_init(scene_61_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_61_1
    load_vram(0x5400, actor_sc61_1_spr, ACTOR_SCENE_61_1_VRAM_SIZE);
    load_palette(17, actor_sc61_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_61_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_61_1_X, ACTOR_SCENE_61_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_62
  else if (scene_num == 62) {
#ifdef SCENE_62_TYPE
    g_current_scene_type = SCENE_62_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene62_chr, bg_scene62_pal, bg_scene62_bat, 32, 28);
#ifdef HAS_SCENE_62_COLLISIONS
    collision_init(scene_62_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_62_1
    load_vram(0x5400, actor_sc62_1_spr, ACTOR_SCENE_62_1_VRAM_SIZE);
    load_palette(17, actor_sc62_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_62_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_62_1_X, ACTOR_SCENE_62_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_63
  else if (scene_num == 63) {
#ifdef SCENE_63_TYPE
    g_current_scene_type = SCENE_63_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene63_chr, bg_scene63_pal, bg_scene63_bat, 32, 28);
#ifdef HAS_SCENE_63_COLLISIONS
    collision_init(scene_63_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_63_1
    load_vram(0x5400, actor_sc63_1_spr, ACTOR_SCENE_63_1_VRAM_SIZE);
    load_palette(17, actor_sc63_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_63_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_63_1_X, ACTOR_SCENE_63_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_64
  else if (scene_num == 64) {
#ifdef SCENE_64_TYPE
    g_current_scene_type = SCENE_64_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene64_chr, bg_scene64_pal, bg_scene64_bat, 32, 28);
#ifdef HAS_SCENE_64_COLLISIONS
    collision_init(scene_64_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_64_1
    load_vram(0x5400, actor_sc64_1_spr, ACTOR_SCENE_64_1_VRAM_SIZE);
    load_palette(17, actor_sc64_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_64_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_64_1_X, ACTOR_SCENE_64_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_65
  else if (scene_num == 65) {
#ifdef SCENE_65_TYPE
    g_current_scene_type = SCENE_65_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene65_chr, bg_scene65_pal, bg_scene65_bat, 32, 28);
#ifdef HAS_SCENE_65_COLLISIONS
    collision_init(scene_65_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_65_1
    load_vram(0x5400, actor_sc65_1_spr, ACTOR_SCENE_65_1_VRAM_SIZE);
    load_palette(17, actor_sc65_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_65_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_65_1_X, ACTOR_SCENE_65_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_66
  else if (scene_num == 66) {
#ifdef SCENE_66_TYPE
    g_current_scene_type = SCENE_66_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene66_chr, bg_scene66_pal, bg_scene66_bat, 32, 28);
#ifdef HAS_SCENE_66_COLLISIONS
    collision_init(scene_66_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_66_1
    load_vram(0x5400, actor_sc66_1_spr, ACTOR_SCENE_66_1_VRAM_SIZE);
    load_palette(17, actor_sc66_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_66_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_66_1_X, ACTOR_SCENE_66_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_67
  else if (scene_num == 67) {
#ifdef SCENE_67_TYPE
    g_current_scene_type = SCENE_67_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene67_chr, bg_scene67_pal, bg_scene67_bat, 32, 28);
#ifdef HAS_SCENE_67_COLLISIONS
    collision_init(scene_67_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_67_1
    load_vram(0x5400, actor_sc67_1_spr, ACTOR_SCENE_67_1_VRAM_SIZE);
    load_palette(17, actor_sc67_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_67_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_67_1_X, ACTOR_SCENE_67_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_68
  else if (scene_num == 68) {
#ifdef SCENE_68_TYPE
    g_current_scene_type = SCENE_68_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene68_chr, bg_scene68_pal, bg_scene68_bat, 32, 28);
#ifdef HAS_SCENE_68_COLLISIONS
    collision_init(scene_68_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_68_1
    load_vram(0x5400, actor_sc68_1_spr, ACTOR_SCENE_68_1_VRAM_SIZE);
    load_palette(17, actor_sc68_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_68_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_68_1_X, ACTOR_SCENE_68_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_69
  else if (scene_num == 69) {
#ifdef SCENE_69_TYPE
    g_current_scene_type = SCENE_69_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene69_chr, bg_scene69_pal, bg_scene69_bat, 32, 28);
#ifdef HAS_SCENE_69_COLLISIONS
    collision_init(scene_69_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_69_1
    load_vram(0x5400, actor_sc69_1_spr, ACTOR_SCENE_69_1_VRAM_SIZE);
    load_palette(17, actor_sc69_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_69_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_69_1_X, ACTOR_SCENE_69_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_70
  else if (scene_num == 70) {
#ifdef SCENE_70_TYPE
    g_current_scene_type = SCENE_70_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene70_chr, bg_scene70_pal, bg_scene70_bat, 32, 28);
#ifdef HAS_SCENE_70_COLLISIONS
    collision_init(scene_70_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_70_1
    load_vram(0x5400, actor_sc70_1_spr, ACTOR_SCENE_70_1_VRAM_SIZE);
    load_palette(17, actor_sc70_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_70_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_70_1_X, ACTOR_SCENE_70_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_71
  else if (scene_num == 71) {
#ifdef SCENE_71_TYPE
    g_current_scene_type = SCENE_71_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene71_chr, bg_scene71_pal, bg_scene71_bat, 32, 28);
#ifdef HAS_SCENE_71_COLLISIONS
    collision_init(scene_71_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_71_1
    load_vram(0x5400, actor_sc71_1_spr, ACTOR_SCENE_71_1_VRAM_SIZE);
    load_palette(17, actor_sc71_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_71_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_71_1_X, ACTOR_SCENE_71_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_72
  else if (scene_num == 72) {
#ifdef SCENE_72_TYPE
    g_current_scene_type = SCENE_72_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene72_chr, bg_scene72_pal, bg_scene72_bat, 32, 28);
#ifdef HAS_SCENE_72_COLLISIONS
    collision_init(scene_72_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_72_1
    load_vram(0x5400, actor_sc72_1_spr, ACTOR_SCENE_72_1_VRAM_SIZE);
    load_palette(17, actor_sc72_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_72_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_72_1_X, ACTOR_SCENE_72_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_73
  else if (scene_num == 73) {
#ifdef SCENE_73_TYPE
    g_current_scene_type = SCENE_73_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene73_chr, bg_scene73_pal, bg_scene73_bat, 32, 28);
#ifdef HAS_SCENE_73_COLLISIONS
    collision_init(scene_73_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_73_1
    load_vram(0x5400, actor_sc73_1_spr, ACTOR_SCENE_73_1_VRAM_SIZE);
    load_palette(17, actor_sc73_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_73_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_73_1_X, ACTOR_SCENE_73_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_74
  else if (scene_num == 74) {
#ifdef SCENE_74_TYPE
    g_current_scene_type = SCENE_74_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene74_chr, bg_scene74_pal, bg_scene74_bat, 32, 28);
#ifdef HAS_SCENE_74_COLLISIONS
    collision_init(scene_74_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_74_1
    load_vram(0x5400, actor_sc74_1_spr, ACTOR_SCENE_74_1_VRAM_SIZE);
    load_palette(17, actor_sc74_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_74_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_74_1_X, ACTOR_SCENE_74_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_75
  else if (scene_num == 75) {
#ifdef SCENE_75_TYPE
    g_current_scene_type = SCENE_75_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene75_chr, bg_scene75_pal, bg_scene75_bat, 32, 28);
#ifdef HAS_SCENE_75_COLLISIONS
    collision_init(scene_75_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_75_1
    load_vram(0x5400, actor_sc75_1_spr, ACTOR_SCENE_75_1_VRAM_SIZE);
    load_palette(17, actor_sc75_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_75_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_75_1_X, ACTOR_SCENE_75_1_Y);
    }
#endif
  }
#endif

}

void load_scene_part4(int scene_num) {
#ifdef HAS_SCENE_76
  if (scene_num == 76) {
#ifdef SCENE_76_TYPE
    g_current_scene_type = SCENE_76_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene76_chr, bg_scene76_pal, bg_scene76_bat, 32, 28);
#ifdef HAS_SCENE_76_COLLISIONS
    collision_init(scene_76_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_76_1
    load_vram(0x5400, actor_sc76_1_spr, ACTOR_SCENE_76_1_VRAM_SIZE);
    load_palette(17, actor_sc76_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_76_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_76_1_X, ACTOR_SCENE_76_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_77
  else if (scene_num == 77) {
#ifdef SCENE_77_TYPE
    g_current_scene_type = SCENE_77_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene77_chr, bg_scene77_pal, bg_scene77_bat, 32, 28);
#ifdef HAS_SCENE_77_COLLISIONS
    collision_init(scene_77_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_77_1
    load_vram(0x5400, actor_sc77_1_spr, ACTOR_SCENE_77_1_VRAM_SIZE);
    load_palette(17, actor_sc77_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_77_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_77_1_X, ACTOR_SCENE_77_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_78
  else if (scene_num == 78) {
#ifdef SCENE_78_TYPE
    g_current_scene_type = SCENE_78_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene78_chr, bg_scene78_pal, bg_scene78_bat, 32, 28);
#ifdef HAS_SCENE_78_COLLISIONS
    collision_init(scene_78_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_78_1
    load_vram(0x5400, actor_sc78_1_spr, ACTOR_SCENE_78_1_VRAM_SIZE);
    load_palette(17, actor_sc78_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_78_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_78_1_X, ACTOR_SCENE_78_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_79
  else if (scene_num == 79) {
#ifdef SCENE_79_TYPE
    g_current_scene_type = SCENE_79_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene79_chr, bg_scene79_pal, bg_scene79_bat, 32, 28);
#ifdef HAS_SCENE_79_COLLISIONS
    collision_init(scene_79_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_79_1
    load_vram(0x5400, actor_sc79_1_spr, ACTOR_SCENE_79_1_VRAM_SIZE);
    load_palette(17, actor_sc79_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_79_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_79_1_X, ACTOR_SCENE_79_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_80
  else if (scene_num == 80) {
#ifdef SCENE_80_TYPE
    g_current_scene_type = SCENE_80_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene80_chr, bg_scene80_pal, bg_scene80_bat, 32, 28);
#ifdef HAS_SCENE_80_COLLISIONS
    collision_init(scene_80_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_80_1
    load_vram(0x5400, actor_sc80_1_spr, ACTOR_SCENE_80_1_VRAM_SIZE);
    load_palette(17, actor_sc80_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_80_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_80_1_X, ACTOR_SCENE_80_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_81
  else if (scene_num == 81) {
#ifdef SCENE_81_TYPE
    g_current_scene_type = SCENE_81_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene81_chr, bg_scene81_pal, bg_scene81_bat, 32, 28);
#ifdef HAS_SCENE_81_COLLISIONS
    collision_init(scene_81_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_81_1
    load_vram(0x5400, actor_sc81_1_spr, ACTOR_SCENE_81_1_VRAM_SIZE);
    load_palette(17, actor_sc81_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_81_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_81_1_X, ACTOR_SCENE_81_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_82
  else if (scene_num == 82) {
#ifdef SCENE_82_TYPE
    g_current_scene_type = SCENE_82_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene82_chr, bg_scene82_pal, bg_scene82_bat, 32, 28);
#ifdef HAS_SCENE_82_COLLISIONS
    collision_init(scene_82_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_82_1
    load_vram(0x5400, actor_sc82_1_spr, ACTOR_SCENE_82_1_VRAM_SIZE);
    load_palette(17, actor_sc82_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_82_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_82_1_X, ACTOR_SCENE_82_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_83
  else if (scene_num == 83) {
#ifdef SCENE_83_TYPE
    g_current_scene_type = SCENE_83_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene83_chr, bg_scene83_pal, bg_scene83_bat, 32, 28);
#ifdef HAS_SCENE_83_COLLISIONS
    collision_init(scene_83_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_83_1
    load_vram(0x5400, actor_sc83_1_spr, ACTOR_SCENE_83_1_VRAM_SIZE);
    load_palette(17, actor_sc83_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_83_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_83_1_X, ACTOR_SCENE_83_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_84
  else if (scene_num == 84) {
#ifdef SCENE_84_TYPE
    g_current_scene_type = SCENE_84_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene84_chr, bg_scene84_pal, bg_scene84_bat, 32, 28);
#ifdef HAS_SCENE_84_COLLISIONS
    collision_init(scene_84_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_84_1
    load_vram(0x5400, actor_sc84_1_spr, ACTOR_SCENE_84_1_VRAM_SIZE);
    load_palette(17, actor_sc84_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_84_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_84_1_X, ACTOR_SCENE_84_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_85
  else if (scene_num == 85) {
#ifdef SCENE_85_TYPE
    g_current_scene_type = SCENE_85_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene85_chr, bg_scene85_pal, bg_scene85_bat, 32, 28);
#ifdef HAS_SCENE_85_COLLISIONS
    collision_init(scene_85_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_85_1
    load_vram(0x5400, actor_sc85_1_spr, ACTOR_SCENE_85_1_VRAM_SIZE);
    load_palette(17, actor_sc85_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_85_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_85_1_X, ACTOR_SCENE_85_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_86
  else if (scene_num == 86) {
#ifdef SCENE_86_TYPE
    g_current_scene_type = SCENE_86_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene86_chr, bg_scene86_pal, bg_scene86_bat, 32, 28);
#ifdef HAS_SCENE_86_COLLISIONS
    collision_init(scene_86_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_86_1
    load_vram(0x5400, actor_sc86_1_spr, ACTOR_SCENE_86_1_VRAM_SIZE);
    load_palette(17, actor_sc86_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_86_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_86_1_X, ACTOR_SCENE_86_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_87
  else if (scene_num == 87) {
#ifdef SCENE_87_TYPE
    g_current_scene_type = SCENE_87_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene87_chr, bg_scene87_pal, bg_scene87_bat, 32, 28);
#ifdef HAS_SCENE_87_COLLISIONS
    collision_init(scene_87_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_87_1
    load_vram(0x5400, actor_sc87_1_spr, ACTOR_SCENE_87_1_VRAM_SIZE);
    load_palette(17, actor_sc87_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_87_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_87_1_X, ACTOR_SCENE_87_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_88
  else if (scene_num == 88) {
#ifdef SCENE_88_TYPE
    g_current_scene_type = SCENE_88_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene88_chr, bg_scene88_pal, bg_scene88_bat, 32, 28);
#ifdef HAS_SCENE_88_COLLISIONS
    collision_init(scene_88_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_88_1
    load_vram(0x5400, actor_sc88_1_spr, ACTOR_SCENE_88_1_VRAM_SIZE);
    load_palette(17, actor_sc88_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_88_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_88_1_X, ACTOR_SCENE_88_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_89
  else if (scene_num == 89) {
#ifdef SCENE_89_TYPE
    g_current_scene_type = SCENE_89_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene89_chr, bg_scene89_pal, bg_scene89_bat, 32, 28);
#ifdef HAS_SCENE_89_COLLISIONS
    collision_init(scene_89_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_89_1
    load_vram(0x5400, actor_sc89_1_spr, ACTOR_SCENE_89_1_VRAM_SIZE);
    load_palette(17, actor_sc89_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_89_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_89_1_X, ACTOR_SCENE_89_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_90
  else if (scene_num == 90) {
#ifdef SCENE_90_TYPE
    g_current_scene_type = SCENE_90_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene90_chr, bg_scene90_pal, bg_scene90_bat, 32, 28);
#ifdef HAS_SCENE_90_COLLISIONS
    collision_init(scene_90_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_90_1
    load_vram(0x5400, actor_sc90_1_spr, ACTOR_SCENE_90_1_VRAM_SIZE);
    load_palette(17, actor_sc90_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_90_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_90_1_X, ACTOR_SCENE_90_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_91
  else if (scene_num == 91) {
#ifdef SCENE_91_TYPE
    g_current_scene_type = SCENE_91_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene91_chr, bg_scene91_pal, bg_scene91_bat, 32, 28);
#ifdef HAS_SCENE_91_COLLISIONS
    collision_init(scene_91_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_91_1
    load_vram(0x5400, actor_sc91_1_spr, ACTOR_SCENE_91_1_VRAM_SIZE);
    load_palette(17, actor_sc91_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_91_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_91_1_X, ACTOR_SCENE_91_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_92
  else if (scene_num == 92) {
#ifdef SCENE_92_TYPE
    g_current_scene_type = SCENE_92_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene92_chr, bg_scene92_pal, bg_scene92_bat, 32, 28);
#ifdef HAS_SCENE_92_COLLISIONS
    collision_init(scene_92_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_92_1
    load_vram(0x5400, actor_sc92_1_spr, ACTOR_SCENE_92_1_VRAM_SIZE);
    load_palette(17, actor_sc92_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_92_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_92_1_X, ACTOR_SCENE_92_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_93
  else if (scene_num == 93) {
#ifdef SCENE_93_TYPE
    g_current_scene_type = SCENE_93_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene93_chr, bg_scene93_pal, bg_scene93_bat, 32, 28);
#ifdef HAS_SCENE_93_COLLISIONS
    collision_init(scene_93_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_93_1
    load_vram(0x5400, actor_sc93_1_spr, ACTOR_SCENE_93_1_VRAM_SIZE);
    load_palette(17, actor_sc93_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_93_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_93_1_X, ACTOR_SCENE_93_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_94
  else if (scene_num == 94) {
#ifdef SCENE_94_TYPE
    g_current_scene_type = SCENE_94_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene94_chr, bg_scene94_pal, bg_scene94_bat, 32, 28);
#ifdef HAS_SCENE_94_COLLISIONS
    collision_init(scene_94_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_94_1
    load_vram(0x5400, actor_sc94_1_spr, ACTOR_SCENE_94_1_VRAM_SIZE);
    load_palette(17, actor_sc94_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_94_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_94_1_X, ACTOR_SCENE_94_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_95
  else if (scene_num == 95) {
#ifdef SCENE_95_TYPE
    g_current_scene_type = SCENE_95_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene95_chr, bg_scene95_pal, bg_scene95_bat, 32, 28);
#ifdef HAS_SCENE_95_COLLISIONS
    collision_init(scene_95_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_95_1
    load_vram(0x5400, actor_sc95_1_spr, ACTOR_SCENE_95_1_VRAM_SIZE);
    load_palette(17, actor_sc95_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_95_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_95_1_X, ACTOR_SCENE_95_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_96
  else if (scene_num == 96) {
#ifdef SCENE_96_TYPE
    g_current_scene_type = SCENE_96_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene96_chr, bg_scene96_pal, bg_scene96_bat, 32, 28);
#ifdef HAS_SCENE_96_COLLISIONS
    collision_init(scene_96_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_96_1
    load_vram(0x5400, actor_sc96_1_spr, ACTOR_SCENE_96_1_VRAM_SIZE);
    load_palette(17, actor_sc96_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_96_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_96_1_X, ACTOR_SCENE_96_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_97
  else if (scene_num == 97) {
#ifdef SCENE_97_TYPE
    g_current_scene_type = SCENE_97_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene97_chr, bg_scene97_pal, bg_scene97_bat, 32, 28);
#ifdef HAS_SCENE_97_COLLISIONS
    collision_init(scene_97_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_97_1
    load_vram(0x5400, actor_sc97_1_spr, ACTOR_SCENE_97_1_VRAM_SIZE);
    load_palette(17, actor_sc97_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_97_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_97_1_X, ACTOR_SCENE_97_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_98
  else if (scene_num == 98) {
#ifdef SCENE_98_TYPE
    g_current_scene_type = SCENE_98_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene98_chr, bg_scene98_pal, bg_scene98_bat, 32, 28);
#ifdef HAS_SCENE_98_COLLISIONS
    collision_init(scene_98_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_98_1
    load_vram(0x5400, actor_sc98_1_spr, ACTOR_SCENE_98_1_VRAM_SIZE);
    load_palette(17, actor_sc98_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_98_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_98_1_X, ACTOR_SCENE_98_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_99
  else if (scene_num == 99) {
#ifdef SCENE_99_TYPE
    g_current_scene_type = SCENE_99_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene99_chr, bg_scene99_pal, bg_scene99_bat, 32, 28);
#ifdef HAS_SCENE_99_COLLISIONS
    collision_init(scene_99_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_99_1
    load_vram(0x5400, actor_sc99_1_spr, ACTOR_SCENE_99_1_VRAM_SIZE);
    load_palette(17, actor_sc99_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_99_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_99_1_X, ACTOR_SCENE_99_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_100
  else if (scene_num == 100) {
#ifdef SCENE_100_TYPE
    g_current_scene_type = SCENE_100_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene100_chr, bg_scene100_pal, bg_scene100_bat, 32, 28);
#ifdef HAS_SCENE_100_COLLISIONS
    collision_init(scene_100_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_100_1
    load_vram(0x5400, actor_sc100_1_spr, ACTOR_SCENE_100_1_VRAM_SIZE);
    load_palette(17, actor_sc100_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_100_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_100_1_X, ACTOR_SCENE_100_1_Y);
    }
#endif
  }
#endif

}

void load_scene_part5(int scene_num) {
#ifdef HAS_SCENE_101
  if (scene_num == 101) {
#ifdef SCENE_101_TYPE
    g_current_scene_type = SCENE_101_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene101_chr, bg_scene101_pal, bg_scene101_bat, 32, 28);
#ifdef HAS_SCENE_101_COLLISIONS
    collision_init(scene_101_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_101_1
    load_vram(0x5400, actor_sc101_1_spr, ACTOR_SCENE_101_1_VRAM_SIZE);
    load_palette(17, actor_sc101_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_101_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_101_1_X, ACTOR_SCENE_101_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_102
  else if (scene_num == 102) {
#ifdef SCENE_102_TYPE
    g_current_scene_type = SCENE_102_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene102_chr, bg_scene102_pal, bg_scene102_bat, 32, 28);
#ifdef HAS_SCENE_102_COLLISIONS
    collision_init(scene_102_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_102_1
    load_vram(0x5400, actor_sc102_1_spr, ACTOR_SCENE_102_1_VRAM_SIZE);
    load_palette(17, actor_sc102_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_102_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_102_1_X, ACTOR_SCENE_102_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_103
  else if (scene_num == 103) {
#ifdef SCENE_103_TYPE
    g_current_scene_type = SCENE_103_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene103_chr, bg_scene103_pal, bg_scene103_bat, 32, 28);
#ifdef HAS_SCENE_103_COLLISIONS
    collision_init(scene_103_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_103_1
    load_vram(0x5400, actor_sc103_1_spr, ACTOR_SCENE_103_1_VRAM_SIZE);
    load_palette(17, actor_sc103_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_103_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_103_1_X, ACTOR_SCENE_103_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_104
  else if (scene_num == 104) {
#ifdef SCENE_104_TYPE
    g_current_scene_type = SCENE_104_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene104_chr, bg_scene104_pal, bg_scene104_bat, 32, 28);
#ifdef HAS_SCENE_104_COLLISIONS
    collision_init(scene_104_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_104_1
    load_vram(0x5400, actor_sc104_1_spr, ACTOR_SCENE_104_1_VRAM_SIZE);
    load_palette(17, actor_sc104_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_104_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_104_1_X, ACTOR_SCENE_104_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_105
  else if (scene_num == 105) {
#ifdef SCENE_105_TYPE
    g_current_scene_type = SCENE_105_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene105_chr, bg_scene105_pal, bg_scene105_bat, 32, 28);
#ifdef HAS_SCENE_105_COLLISIONS
    collision_init(scene_105_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_105_1
    load_vram(0x5400, actor_sc105_1_spr, ACTOR_SCENE_105_1_VRAM_SIZE);
    load_palette(17, actor_sc105_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_105_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_105_1_X, ACTOR_SCENE_105_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_106
  else if (scene_num == 106) {
#ifdef SCENE_106_TYPE
    g_current_scene_type = SCENE_106_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene106_chr, bg_scene106_pal, bg_scene106_bat, 32, 28);
#ifdef HAS_SCENE_106_COLLISIONS
    collision_init(scene_106_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_106_1
    load_vram(0x5400, actor_sc106_1_spr, ACTOR_SCENE_106_1_VRAM_SIZE);
    load_palette(17, actor_sc106_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_106_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_106_1_X, ACTOR_SCENE_106_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_107
  else if (scene_num == 107) {
#ifdef SCENE_107_TYPE
    g_current_scene_type = SCENE_107_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene107_chr, bg_scene107_pal, bg_scene107_bat, 32, 28);
#ifdef HAS_SCENE_107_COLLISIONS
    collision_init(scene_107_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_107_1
    load_vram(0x5400, actor_sc107_1_spr, ACTOR_SCENE_107_1_VRAM_SIZE);
    load_palette(17, actor_sc107_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_107_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_107_1_X, ACTOR_SCENE_107_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_108
  else if (scene_num == 108) {
#ifdef SCENE_108_TYPE
    g_current_scene_type = SCENE_108_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene108_chr, bg_scene108_pal, bg_scene108_bat, 32, 28);
#ifdef HAS_SCENE_108_COLLISIONS
    collision_init(scene_108_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_108_1
    load_vram(0x5400, actor_sc108_1_spr, ACTOR_SCENE_108_1_VRAM_SIZE);
    load_palette(17, actor_sc108_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_108_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_108_1_X, ACTOR_SCENE_108_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_109
  else if (scene_num == 109) {
#ifdef SCENE_109_TYPE
    g_current_scene_type = SCENE_109_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene109_chr, bg_scene109_pal, bg_scene109_bat, 32, 28);
#ifdef HAS_SCENE_109_COLLISIONS
    collision_init(scene_109_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_109_1
    load_vram(0x5400, actor_sc109_1_spr, ACTOR_SCENE_109_1_VRAM_SIZE);
    load_palette(17, actor_sc109_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_109_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_109_1_X, ACTOR_SCENE_109_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_110
  else if (scene_num == 110) {
#ifdef SCENE_110_TYPE
    g_current_scene_type = SCENE_110_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene110_chr, bg_scene110_pal, bg_scene110_bat, 32, 28);
#ifdef HAS_SCENE_110_COLLISIONS
    collision_init(scene_110_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_110_1
    load_vram(0x5400, actor_sc110_1_spr, ACTOR_SCENE_110_1_VRAM_SIZE);
    load_palette(17, actor_sc110_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_110_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_110_1_X, ACTOR_SCENE_110_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_111
  else if (scene_num == 111) {
#ifdef SCENE_111_TYPE
    g_current_scene_type = SCENE_111_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene111_chr, bg_scene111_pal, bg_scene111_bat, 32, 28);
#ifdef HAS_SCENE_111_COLLISIONS
    collision_init(scene_111_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_111_1
    load_vram(0x5400, actor_sc111_1_spr, ACTOR_SCENE_111_1_VRAM_SIZE);
    load_palette(17, actor_sc111_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_111_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_111_1_X, ACTOR_SCENE_111_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_112
  else if (scene_num == 112) {
#ifdef SCENE_112_TYPE
    g_current_scene_type = SCENE_112_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene112_chr, bg_scene112_pal, bg_scene112_bat, 32, 28);
#ifdef HAS_SCENE_112_COLLISIONS
    collision_init(scene_112_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_112_1
    load_vram(0x5400, actor_sc112_1_spr, ACTOR_SCENE_112_1_VRAM_SIZE);
    load_palette(17, actor_sc112_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_112_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_112_1_X, ACTOR_SCENE_112_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_113
  else if (scene_num == 113) {
#ifdef SCENE_113_TYPE
    g_current_scene_type = SCENE_113_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene113_chr, bg_scene113_pal, bg_scene113_bat, 32, 28);
#ifdef HAS_SCENE_113_COLLISIONS
    collision_init(scene_113_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_113_1
    load_vram(0x5400, actor_sc113_1_spr, ACTOR_SCENE_113_1_VRAM_SIZE);
    load_palette(17, actor_sc113_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_113_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_113_1_X, ACTOR_SCENE_113_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_114
  else if (scene_num == 114) {
#ifdef SCENE_114_TYPE
    g_current_scene_type = SCENE_114_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene114_chr, bg_scene114_pal, bg_scene114_bat, 32, 28);
#ifdef HAS_SCENE_114_COLLISIONS
    collision_init(scene_114_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_114_1
    load_vram(0x5400, actor_sc114_1_spr, ACTOR_SCENE_114_1_VRAM_SIZE);
    load_palette(17, actor_sc114_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_114_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_114_1_X, ACTOR_SCENE_114_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_115
  else if (scene_num == 115) {
#ifdef SCENE_115_TYPE
    g_current_scene_type = SCENE_115_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene115_chr, bg_scene115_pal, bg_scene115_bat, 32, 28);
#ifdef HAS_SCENE_115_COLLISIONS
    collision_init(scene_115_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_115_1
    load_vram(0x5400, actor_sc115_1_spr, ACTOR_SCENE_115_1_VRAM_SIZE);
    load_palette(17, actor_sc115_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_115_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_115_1_X, ACTOR_SCENE_115_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_116
  else if (scene_num == 116) {
#ifdef SCENE_116_TYPE
    g_current_scene_type = SCENE_116_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene116_chr, bg_scene116_pal, bg_scene116_bat, 32, 28);
#ifdef HAS_SCENE_116_COLLISIONS
    collision_init(scene_116_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_116_1
    load_vram(0x5400, actor_sc116_1_spr, ACTOR_SCENE_116_1_VRAM_SIZE);
    load_palette(17, actor_sc116_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_116_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_116_1_X, ACTOR_SCENE_116_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_117
  else if (scene_num == 117) {
#ifdef SCENE_117_TYPE
    g_current_scene_type = SCENE_117_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene117_chr, bg_scene117_pal, bg_scene117_bat, 32, 28);
#ifdef HAS_SCENE_117_COLLISIONS
    collision_init(scene_117_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_117_1
    load_vram(0x5400, actor_sc117_1_spr, ACTOR_SCENE_117_1_VRAM_SIZE);
    load_palette(17, actor_sc117_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_117_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_117_1_X, ACTOR_SCENE_117_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_118
  else if (scene_num == 118) {
#ifdef SCENE_118_TYPE
    g_current_scene_type = SCENE_118_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene118_chr, bg_scene118_pal, bg_scene118_bat, 32, 28);
#ifdef HAS_SCENE_118_COLLISIONS
    collision_init(scene_118_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_118_1
    load_vram(0x5400, actor_sc118_1_spr, ACTOR_SCENE_118_1_VRAM_SIZE);
    load_palette(17, actor_sc118_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_118_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_118_1_X, ACTOR_SCENE_118_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_119
  else if (scene_num == 119) {
#ifdef SCENE_119_TYPE
    g_current_scene_type = SCENE_119_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene119_chr, bg_scene119_pal, bg_scene119_bat, 32, 28);
#ifdef HAS_SCENE_119_COLLISIONS
    collision_init(scene_119_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_119_1
    load_vram(0x5400, actor_sc119_1_spr, ACTOR_SCENE_119_1_VRAM_SIZE);
    load_palette(17, actor_sc119_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_119_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_119_1_X, ACTOR_SCENE_119_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_120
  else if (scene_num == 120) {
#ifdef SCENE_120_TYPE
    g_current_scene_type = SCENE_120_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene120_chr, bg_scene120_pal, bg_scene120_bat, 32, 28);
#ifdef HAS_SCENE_120_COLLISIONS
    collision_init(scene_120_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_120_1
    load_vram(0x5400, actor_sc120_1_spr, ACTOR_SCENE_120_1_VRAM_SIZE);
    load_palette(17, actor_sc120_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_120_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_120_1_X, ACTOR_SCENE_120_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_121
  else if (scene_num == 121) {
#ifdef SCENE_121_TYPE
    g_current_scene_type = SCENE_121_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene121_chr, bg_scene121_pal, bg_scene121_bat, 32, 28);
#ifdef HAS_SCENE_121_COLLISIONS
    collision_init(scene_121_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_121_1
    load_vram(0x5400, actor_sc121_1_spr, ACTOR_SCENE_121_1_VRAM_SIZE);
    load_palette(17, actor_sc121_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_121_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_121_1_X, ACTOR_SCENE_121_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_122
  else if (scene_num == 122) {
#ifdef SCENE_122_TYPE
    g_current_scene_type = SCENE_122_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene122_chr, bg_scene122_pal, bg_scene122_bat, 32, 28);
#ifdef HAS_SCENE_122_COLLISIONS
    collision_init(scene_122_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_122_1
    load_vram(0x5400, actor_sc122_1_spr, ACTOR_SCENE_122_1_VRAM_SIZE);
    load_palette(17, actor_sc122_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_122_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_122_1_X, ACTOR_SCENE_122_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_123
  else if (scene_num == 123) {
#ifdef SCENE_123_TYPE
    g_current_scene_type = SCENE_123_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene123_chr, bg_scene123_pal, bg_scene123_bat, 32, 28);
#ifdef HAS_SCENE_123_COLLISIONS
    collision_init(scene_123_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_123_1
    load_vram(0x5400, actor_sc123_1_spr, ACTOR_SCENE_123_1_VRAM_SIZE);
    load_palette(17, actor_sc123_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_123_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_123_1_X, ACTOR_SCENE_123_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_124
  else if (scene_num == 124) {
#ifdef SCENE_124_TYPE
    g_current_scene_type = SCENE_124_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene124_chr, bg_scene124_pal, bg_scene124_bat, 32, 28);
#ifdef HAS_SCENE_124_COLLISIONS
    collision_init(scene_124_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_124_1
    load_vram(0x5400, actor_sc124_1_spr, ACTOR_SCENE_124_1_VRAM_SIZE);
    load_palette(17, actor_sc124_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_124_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_124_1_X, ACTOR_SCENE_124_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_125
  else if (scene_num == 125) {
#ifdef SCENE_125_TYPE
    g_current_scene_type = SCENE_125_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene125_chr, bg_scene125_pal, bg_scene125_bat, 32, 28);
#ifdef HAS_SCENE_125_COLLISIONS
    collision_init(scene_125_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_125_1
    load_vram(0x5400, actor_sc125_1_spr, ACTOR_SCENE_125_1_VRAM_SIZE);
    load_palette(17, actor_sc125_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_125_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_125_1_X, ACTOR_SCENE_125_1_Y);
    }
#endif
  }
#endif

}

void load_scene_part6(int scene_num) {
#ifdef HAS_SCENE_126
  if (scene_num == 126) {
#ifdef SCENE_126_TYPE
    g_current_scene_type = SCENE_126_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene126_chr, bg_scene126_pal, bg_scene126_bat, 32, 28);
#ifdef HAS_SCENE_126_COLLISIONS
    collision_init(scene_126_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_126_1
    load_vram(0x5400, actor_sc126_1_spr, ACTOR_SCENE_126_1_VRAM_SIZE);
    load_palette(17, actor_sc126_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_126_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_126_1_X, ACTOR_SCENE_126_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_127
  else if (scene_num == 127) {
#ifdef SCENE_127_TYPE
    g_current_scene_type = SCENE_127_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene127_chr, bg_scene127_pal, bg_scene127_bat, 32, 28);
#ifdef HAS_SCENE_127_COLLISIONS
    collision_init(scene_127_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_127_1
    load_vram(0x5400, actor_sc127_1_spr, ACTOR_SCENE_127_1_VRAM_SIZE);
    load_palette(17, actor_sc127_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_127_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_127_1_X, ACTOR_SCENE_127_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_128
  else if (scene_num == 128) {
#ifdef SCENE_128_TYPE
    g_current_scene_type = SCENE_128_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene128_chr, bg_scene128_pal, bg_scene128_bat, 32, 28);
#ifdef HAS_SCENE_128_COLLISIONS
    collision_init(scene_128_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_128_1
    load_vram(0x5400, actor_sc128_1_spr, ACTOR_SCENE_128_1_VRAM_SIZE);
    load_palette(17, actor_sc128_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_128_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_128_1_X, ACTOR_SCENE_128_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_129
  else if (scene_num == 129) {
#ifdef SCENE_129_TYPE
    g_current_scene_type = SCENE_129_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene129_chr, bg_scene129_pal, bg_scene129_bat, 32, 28);
#ifdef HAS_SCENE_129_COLLISIONS
    collision_init(scene_129_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_129_1
    load_vram(0x5400, actor_sc129_1_spr, ACTOR_SCENE_129_1_VRAM_SIZE);
    load_palette(17, actor_sc129_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_129_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_129_1_X, ACTOR_SCENE_129_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_130
  else if (scene_num == 130) {
#ifdef SCENE_130_TYPE
    g_current_scene_type = SCENE_130_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene130_chr, bg_scene130_pal, bg_scene130_bat, 32, 28);
#ifdef HAS_SCENE_130_COLLISIONS
    collision_init(scene_130_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_130_1
    load_vram(0x5400, actor_sc130_1_spr, ACTOR_SCENE_130_1_VRAM_SIZE);
    load_palette(17, actor_sc130_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_130_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_130_1_X, ACTOR_SCENE_130_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_131
  else if (scene_num == 131) {
#ifdef SCENE_131_TYPE
    g_current_scene_type = SCENE_131_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene131_chr, bg_scene131_pal, bg_scene131_bat, 32, 28);
#ifdef HAS_SCENE_131_COLLISIONS
    collision_init(scene_131_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_131_1
    load_vram(0x5400, actor_sc131_1_spr, ACTOR_SCENE_131_1_VRAM_SIZE);
    load_palette(17, actor_sc131_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_131_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_131_1_X, ACTOR_SCENE_131_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_132
  else if (scene_num == 132) {
#ifdef SCENE_132_TYPE
    g_current_scene_type = SCENE_132_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene132_chr, bg_scene132_pal, bg_scene132_bat, 32, 28);
#ifdef HAS_SCENE_132_COLLISIONS
    collision_init(scene_132_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_132_1
    load_vram(0x5400, actor_sc132_1_spr, ACTOR_SCENE_132_1_VRAM_SIZE);
    load_palette(17, actor_sc132_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_132_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_132_1_X, ACTOR_SCENE_132_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_133
  else if (scene_num == 133) {
#ifdef SCENE_133_TYPE
    g_current_scene_type = SCENE_133_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene133_chr, bg_scene133_pal, bg_scene133_bat, 32, 28);
#ifdef HAS_SCENE_133_COLLISIONS
    collision_init(scene_133_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_133_1
    load_vram(0x5400, actor_sc133_1_spr, ACTOR_SCENE_133_1_VRAM_SIZE);
    load_palette(17, actor_sc133_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_133_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_133_1_X, ACTOR_SCENE_133_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_134
  else if (scene_num == 134) {
#ifdef SCENE_134_TYPE
    g_current_scene_type = SCENE_134_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene134_chr, bg_scene134_pal, bg_scene134_bat, 32, 28);
#ifdef HAS_SCENE_134_COLLISIONS
    collision_init(scene_134_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_134_1
    load_vram(0x5400, actor_sc134_1_spr, ACTOR_SCENE_134_1_VRAM_SIZE);
    load_palette(17, actor_sc134_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_134_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_134_1_X, ACTOR_SCENE_134_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_135
  else if (scene_num == 135) {
#ifdef SCENE_135_TYPE
    g_current_scene_type = SCENE_135_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene135_chr, bg_scene135_pal, bg_scene135_bat, 32, 28);
#ifdef HAS_SCENE_135_COLLISIONS
    collision_init(scene_135_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_135_1
    load_vram(0x5400, actor_sc135_1_spr, ACTOR_SCENE_135_1_VRAM_SIZE);
    load_palette(17, actor_sc135_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_135_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_135_1_X, ACTOR_SCENE_135_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_136
  else if (scene_num == 136) {
#ifdef SCENE_136_TYPE
    g_current_scene_type = SCENE_136_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene136_chr, bg_scene136_pal, bg_scene136_bat, 32, 28);
#ifdef HAS_SCENE_136_COLLISIONS
    collision_init(scene_136_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_136_1
    load_vram(0x5400, actor_sc136_1_spr, ACTOR_SCENE_136_1_VRAM_SIZE);
    load_palette(17, actor_sc136_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_136_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_136_1_X, ACTOR_SCENE_136_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_137
  else if (scene_num == 137) {
#ifdef SCENE_137_TYPE
    g_current_scene_type = SCENE_137_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene137_chr, bg_scene137_pal, bg_scene137_bat, 32, 28);
#ifdef HAS_SCENE_137_COLLISIONS
    collision_init(scene_137_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_137_1
    load_vram(0x5400, actor_sc137_1_spr, ACTOR_SCENE_137_1_VRAM_SIZE);
    load_palette(17, actor_sc137_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_137_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_137_1_X, ACTOR_SCENE_137_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_138
  else if (scene_num == 138) {
#ifdef SCENE_138_TYPE
    g_current_scene_type = SCENE_138_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene138_chr, bg_scene138_pal, bg_scene138_bat, 32, 28);
#ifdef HAS_SCENE_138_COLLISIONS
    collision_init(scene_138_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_138_1
    load_vram(0x5400, actor_sc138_1_spr, ACTOR_SCENE_138_1_VRAM_SIZE);
    load_palette(17, actor_sc138_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_138_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_138_1_X, ACTOR_SCENE_138_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_139
  else if (scene_num == 139) {
#ifdef SCENE_139_TYPE
    g_current_scene_type = SCENE_139_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene139_chr, bg_scene139_pal, bg_scene139_bat, 32, 28);
#ifdef HAS_SCENE_139_COLLISIONS
    collision_init(scene_139_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_139_1
    load_vram(0x5400, actor_sc139_1_spr, ACTOR_SCENE_139_1_VRAM_SIZE);
    load_palette(17, actor_sc139_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_139_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_139_1_X, ACTOR_SCENE_139_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_140
  else if (scene_num == 140) {
#ifdef SCENE_140_TYPE
    g_current_scene_type = SCENE_140_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene140_chr, bg_scene140_pal, bg_scene140_bat, 32, 28);
#ifdef HAS_SCENE_140_COLLISIONS
    collision_init(scene_140_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_140_1
    load_vram(0x5400, actor_sc140_1_spr, ACTOR_SCENE_140_1_VRAM_SIZE);
    load_palette(17, actor_sc140_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_140_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_140_1_X, ACTOR_SCENE_140_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_141
  else if (scene_num == 141) {
#ifdef SCENE_141_TYPE
    g_current_scene_type = SCENE_141_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene141_chr, bg_scene141_pal, bg_scene141_bat, 32, 28);
#ifdef HAS_SCENE_141_COLLISIONS
    collision_init(scene_141_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_141_1
    load_vram(0x5400, actor_sc141_1_spr, ACTOR_SCENE_141_1_VRAM_SIZE);
    load_palette(17, actor_sc141_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_141_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_141_1_X, ACTOR_SCENE_141_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_142
  else if (scene_num == 142) {
#ifdef SCENE_142_TYPE
    g_current_scene_type = SCENE_142_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene142_chr, bg_scene142_pal, bg_scene142_bat, 32, 28);
#ifdef HAS_SCENE_142_COLLISIONS
    collision_init(scene_142_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_142_1
    load_vram(0x5400, actor_sc142_1_spr, ACTOR_SCENE_142_1_VRAM_SIZE);
    load_palette(17, actor_sc142_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_142_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_142_1_X, ACTOR_SCENE_142_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_143
  else if (scene_num == 143) {
#ifdef SCENE_143_TYPE
    g_current_scene_type = SCENE_143_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene143_chr, bg_scene143_pal, bg_scene143_bat, 32, 28);
#ifdef HAS_SCENE_143_COLLISIONS
    collision_init(scene_143_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_143_1
    load_vram(0x5400, actor_sc143_1_spr, ACTOR_SCENE_143_1_VRAM_SIZE);
    load_palette(17, actor_sc143_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_143_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_143_1_X, ACTOR_SCENE_143_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_144
  else if (scene_num == 144) {
#ifdef SCENE_144_TYPE
    g_current_scene_type = SCENE_144_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene144_chr, bg_scene144_pal, bg_scene144_bat, 32, 28);
#ifdef HAS_SCENE_144_COLLISIONS
    collision_init(scene_144_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_144_1
    load_vram(0x5400, actor_sc144_1_spr, ACTOR_SCENE_144_1_VRAM_SIZE);
    load_palette(17, actor_sc144_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_144_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_144_1_X, ACTOR_SCENE_144_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_145
  else if (scene_num == 145) {
#ifdef SCENE_145_TYPE
    g_current_scene_type = SCENE_145_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene145_chr, bg_scene145_pal, bg_scene145_bat, 32, 28);
#ifdef HAS_SCENE_145_COLLISIONS
    collision_init(scene_145_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_145_1
    load_vram(0x5400, actor_sc145_1_spr, ACTOR_SCENE_145_1_VRAM_SIZE);
    load_palette(17, actor_sc145_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_145_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_145_1_X, ACTOR_SCENE_145_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_146
  else if (scene_num == 146) {
#ifdef SCENE_146_TYPE
    g_current_scene_type = SCENE_146_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene146_chr, bg_scene146_pal, bg_scene146_bat, 32, 28);
#ifdef HAS_SCENE_146_COLLISIONS
    collision_init(scene_146_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_146_1
    load_vram(0x5400, actor_sc146_1_spr, ACTOR_SCENE_146_1_VRAM_SIZE);
    load_palette(17, actor_sc146_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_146_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_146_1_X, ACTOR_SCENE_146_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_147
  else if (scene_num == 147) {
#ifdef SCENE_147_TYPE
    g_current_scene_type = SCENE_147_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene147_chr, bg_scene147_pal, bg_scene147_bat, 32, 28);
#ifdef HAS_SCENE_147_COLLISIONS
    collision_init(scene_147_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_147_1
    load_vram(0x5400, actor_sc147_1_spr, ACTOR_SCENE_147_1_VRAM_SIZE);
    load_palette(17, actor_sc147_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_147_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_147_1_X, ACTOR_SCENE_147_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_148
  else if (scene_num == 148) {
#ifdef SCENE_148_TYPE
    g_current_scene_type = SCENE_148_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene148_chr, bg_scene148_pal, bg_scene148_bat, 32, 28);
#ifdef HAS_SCENE_148_COLLISIONS
    collision_init(scene_148_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_148_1
    load_vram(0x5400, actor_sc148_1_spr, ACTOR_SCENE_148_1_VRAM_SIZE);
    load_palette(17, actor_sc148_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_148_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_148_1_X, ACTOR_SCENE_148_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_149
  else if (scene_num == 149) {
#ifdef SCENE_149_TYPE
    g_current_scene_type = SCENE_149_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene149_chr, bg_scene149_pal, bg_scene149_bat, 32, 28);
#ifdef HAS_SCENE_149_COLLISIONS
    collision_init(scene_149_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_149_1
    load_vram(0x5400, actor_sc149_1_spr, ACTOR_SCENE_149_1_VRAM_SIZE);
    load_palette(17, actor_sc149_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_149_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_149_1_X, ACTOR_SCENE_149_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_150
  else if (scene_num == 150) {
#ifdef SCENE_150_TYPE
    g_current_scene_type = SCENE_150_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene150_chr, bg_scene150_pal, bg_scene150_bat, 32, 28);
#ifdef HAS_SCENE_150_COLLISIONS
    collision_init(scene_150_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_150_1
    load_vram(0x5400, actor_sc150_1_spr, ACTOR_SCENE_150_1_VRAM_SIZE);
    load_palette(17, actor_sc150_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_150_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_150_1_X, ACTOR_SCENE_150_1_Y);
    }
#endif
  }
#endif

}

void load_scene_part7(int scene_num) {
#ifdef HAS_SCENE_151
  if (scene_num == 151) {
#ifdef SCENE_151_TYPE
    g_current_scene_type = SCENE_151_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene151_chr, bg_scene151_pal, bg_scene151_bat, 32, 28);
#ifdef HAS_SCENE_151_COLLISIONS
    collision_init(scene_151_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_151_1
    load_vram(0x5400, actor_sc151_1_spr, ACTOR_SCENE_151_1_VRAM_SIZE);
    load_palette(17, actor_sc151_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_151_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_151_1_X, ACTOR_SCENE_151_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_152
  else if (scene_num == 152) {
#ifdef SCENE_152_TYPE
    g_current_scene_type = SCENE_152_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene152_chr, bg_scene152_pal, bg_scene152_bat, 32, 28);
#ifdef HAS_SCENE_152_COLLISIONS
    collision_init(scene_152_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_152_1
    load_vram(0x5400, actor_sc152_1_spr, ACTOR_SCENE_152_1_VRAM_SIZE);
    load_palette(17, actor_sc152_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_152_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_152_1_X, ACTOR_SCENE_152_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_153
  else if (scene_num == 153) {
#ifdef SCENE_153_TYPE
    g_current_scene_type = SCENE_153_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene153_chr, bg_scene153_pal, bg_scene153_bat, 32, 28);
#ifdef HAS_SCENE_153_COLLISIONS
    collision_init(scene_153_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_153_1
    load_vram(0x5400, actor_sc153_1_spr, ACTOR_SCENE_153_1_VRAM_SIZE);
    load_palette(17, actor_sc153_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_153_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_153_1_X, ACTOR_SCENE_153_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_154
  else if (scene_num == 154) {
#ifdef SCENE_154_TYPE
    g_current_scene_type = SCENE_154_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene154_chr, bg_scene154_pal, bg_scene154_bat, 32, 28);
#ifdef HAS_SCENE_154_COLLISIONS
    collision_init(scene_154_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_154_1
    load_vram(0x5400, actor_sc154_1_spr, ACTOR_SCENE_154_1_VRAM_SIZE);
    load_palette(17, actor_sc154_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_154_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_154_1_X, ACTOR_SCENE_154_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_155
  else if (scene_num == 155) {
#ifdef SCENE_155_TYPE
    g_current_scene_type = SCENE_155_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene155_chr, bg_scene155_pal, bg_scene155_bat, 32, 28);
#ifdef HAS_SCENE_155_COLLISIONS
    collision_init(scene_155_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_155_1
    load_vram(0x5400, actor_sc155_1_spr, ACTOR_SCENE_155_1_VRAM_SIZE);
    load_palette(17, actor_sc155_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_155_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_155_1_X, ACTOR_SCENE_155_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_156
  else if (scene_num == 156) {
#ifdef SCENE_156_TYPE
    g_current_scene_type = SCENE_156_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene156_chr, bg_scene156_pal, bg_scene156_bat, 32, 28);
#ifdef HAS_SCENE_156_COLLISIONS
    collision_init(scene_156_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_156_1
    load_vram(0x5400, actor_sc156_1_spr, ACTOR_SCENE_156_1_VRAM_SIZE);
    load_palette(17, actor_sc156_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_156_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_156_1_X, ACTOR_SCENE_156_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_157
  else if (scene_num == 157) {
#ifdef SCENE_157_TYPE
    g_current_scene_type = SCENE_157_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene157_chr, bg_scene157_pal, bg_scene157_bat, 32, 28);
#ifdef HAS_SCENE_157_COLLISIONS
    collision_init(scene_157_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_157_1
    load_vram(0x5400, actor_sc157_1_spr, ACTOR_SCENE_157_1_VRAM_SIZE);
    load_palette(17, actor_sc157_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_157_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_157_1_X, ACTOR_SCENE_157_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_158
  else if (scene_num == 158) {
#ifdef SCENE_158_TYPE
    g_current_scene_type = SCENE_158_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene158_chr, bg_scene158_pal, bg_scene158_bat, 32, 28);
#ifdef HAS_SCENE_158_COLLISIONS
    collision_init(scene_158_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_158_1
    load_vram(0x5400, actor_sc158_1_spr, ACTOR_SCENE_158_1_VRAM_SIZE);
    load_palette(17, actor_sc158_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_158_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_158_1_X, ACTOR_SCENE_158_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_159
  else if (scene_num == 159) {
#ifdef SCENE_159_TYPE
    g_current_scene_type = SCENE_159_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene159_chr, bg_scene159_pal, bg_scene159_bat, 32, 28);
#ifdef HAS_SCENE_159_COLLISIONS
    collision_init(scene_159_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_159_1
    load_vram(0x5400, actor_sc159_1_spr, ACTOR_SCENE_159_1_VRAM_SIZE);
    load_palette(17, actor_sc159_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_159_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_159_1_X, ACTOR_SCENE_159_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_160
  else if (scene_num == 160) {
#ifdef SCENE_160_TYPE
    g_current_scene_type = SCENE_160_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene160_chr, bg_scene160_pal, bg_scene160_bat, 32, 28);
#ifdef HAS_SCENE_160_COLLISIONS
    collision_init(scene_160_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_160_1
    load_vram(0x5400, actor_sc160_1_spr, ACTOR_SCENE_160_1_VRAM_SIZE);
    load_palette(17, actor_sc160_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_160_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_160_1_X, ACTOR_SCENE_160_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_161
  else if (scene_num == 161) {
#ifdef SCENE_161_TYPE
    g_current_scene_type = SCENE_161_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene161_chr, bg_scene161_pal, bg_scene161_bat, 32, 28);
#ifdef HAS_SCENE_161_COLLISIONS
    collision_init(scene_161_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_161_1
    load_vram(0x5400, actor_sc161_1_spr, ACTOR_SCENE_161_1_VRAM_SIZE);
    load_palette(17, actor_sc161_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_161_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_161_1_X, ACTOR_SCENE_161_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_162
  else if (scene_num == 162) {
#ifdef SCENE_162_TYPE
    g_current_scene_type = SCENE_162_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene162_chr, bg_scene162_pal, bg_scene162_bat, 32, 28);
#ifdef HAS_SCENE_162_COLLISIONS
    collision_init(scene_162_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_162_1
    load_vram(0x5400, actor_sc162_1_spr, ACTOR_SCENE_162_1_VRAM_SIZE);
    load_palette(17, actor_sc162_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_162_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_162_1_X, ACTOR_SCENE_162_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_163
  else if (scene_num == 163) {
#ifdef SCENE_163_TYPE
    g_current_scene_type = SCENE_163_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene163_chr, bg_scene163_pal, bg_scene163_bat, 32, 28);
#ifdef HAS_SCENE_163_COLLISIONS
    collision_init(scene_163_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_163_1
    load_vram(0x5400, actor_sc163_1_spr, ACTOR_SCENE_163_1_VRAM_SIZE);
    load_palette(17, actor_sc163_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_163_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_163_1_X, ACTOR_SCENE_163_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_164
  else if (scene_num == 164) {
#ifdef SCENE_164_TYPE
    g_current_scene_type = SCENE_164_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene164_chr, bg_scene164_pal, bg_scene164_bat, 32, 28);
#ifdef HAS_SCENE_164_COLLISIONS
    collision_init(scene_164_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_164_1
    load_vram(0x5400, actor_sc164_1_spr, ACTOR_SCENE_164_1_VRAM_SIZE);
    load_palette(17, actor_sc164_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_164_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_164_1_X, ACTOR_SCENE_164_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_165
  else if (scene_num == 165) {
#ifdef SCENE_165_TYPE
    g_current_scene_type = SCENE_165_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene165_chr, bg_scene165_pal, bg_scene165_bat, 32, 28);
#ifdef HAS_SCENE_165_COLLISIONS
    collision_init(scene_165_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_165_1
    load_vram(0x5400, actor_sc165_1_spr, ACTOR_SCENE_165_1_VRAM_SIZE);
    load_palette(17, actor_sc165_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_165_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_165_1_X, ACTOR_SCENE_165_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_166
  else if (scene_num == 166) {
#ifdef SCENE_166_TYPE
    g_current_scene_type = SCENE_166_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene166_chr, bg_scene166_pal, bg_scene166_bat, 32, 28);
#ifdef HAS_SCENE_166_COLLISIONS
    collision_init(scene_166_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_166_1
    load_vram(0x5400, actor_sc166_1_spr, ACTOR_SCENE_166_1_VRAM_SIZE);
    load_palette(17, actor_sc166_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_166_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_166_1_X, ACTOR_SCENE_166_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_167
  else if (scene_num == 167) {
#ifdef SCENE_167_TYPE
    g_current_scene_type = SCENE_167_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene167_chr, bg_scene167_pal, bg_scene167_bat, 32, 28);
#ifdef HAS_SCENE_167_COLLISIONS
    collision_init(scene_167_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_167_1
    load_vram(0x5400, actor_sc167_1_spr, ACTOR_SCENE_167_1_VRAM_SIZE);
    load_palette(17, actor_sc167_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_167_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_167_1_X, ACTOR_SCENE_167_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_168
  else if (scene_num == 168) {
#ifdef SCENE_168_TYPE
    g_current_scene_type = SCENE_168_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene168_chr, bg_scene168_pal, bg_scene168_bat, 32, 28);
#ifdef HAS_SCENE_168_COLLISIONS
    collision_init(scene_168_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_168_1
    load_vram(0x5400, actor_sc168_1_spr, ACTOR_SCENE_168_1_VRAM_SIZE);
    load_palette(17, actor_sc168_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_168_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_168_1_X, ACTOR_SCENE_168_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_169
  else if (scene_num == 169) {
#ifdef SCENE_169_TYPE
    g_current_scene_type = SCENE_169_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene169_chr, bg_scene169_pal, bg_scene169_bat, 32, 28);
#ifdef HAS_SCENE_169_COLLISIONS
    collision_init(scene_169_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_169_1
    load_vram(0x5400, actor_sc169_1_spr, ACTOR_SCENE_169_1_VRAM_SIZE);
    load_palette(17, actor_sc169_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_169_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_169_1_X, ACTOR_SCENE_169_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_170
  else if (scene_num == 170) {
#ifdef SCENE_170_TYPE
    g_current_scene_type = SCENE_170_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene170_chr, bg_scene170_pal, bg_scene170_bat, 32, 28);
#ifdef HAS_SCENE_170_COLLISIONS
    collision_init(scene_170_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_170_1
    load_vram(0x5400, actor_sc170_1_spr, ACTOR_SCENE_170_1_VRAM_SIZE);
    load_palette(17, actor_sc170_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_170_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_170_1_X, ACTOR_SCENE_170_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_171
  else if (scene_num == 171) {
#ifdef SCENE_171_TYPE
    g_current_scene_type = SCENE_171_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene171_chr, bg_scene171_pal, bg_scene171_bat, 32, 28);
#ifdef HAS_SCENE_171_COLLISIONS
    collision_init(scene_171_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_171_1
    load_vram(0x5400, actor_sc171_1_spr, ACTOR_SCENE_171_1_VRAM_SIZE);
    load_palette(17, actor_sc171_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_171_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_171_1_X, ACTOR_SCENE_171_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_172
  else if (scene_num == 172) {
#ifdef SCENE_172_TYPE
    g_current_scene_type = SCENE_172_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene172_chr, bg_scene172_pal, bg_scene172_bat, 32, 28);
#ifdef HAS_SCENE_172_COLLISIONS
    collision_init(scene_172_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_172_1
    load_vram(0x5400, actor_sc172_1_spr, ACTOR_SCENE_172_1_VRAM_SIZE);
    load_palette(17, actor_sc172_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_172_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_172_1_X, ACTOR_SCENE_172_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_173
  else if (scene_num == 173) {
#ifdef SCENE_173_TYPE
    g_current_scene_type = SCENE_173_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene173_chr, bg_scene173_pal, bg_scene173_bat, 32, 28);
#ifdef HAS_SCENE_173_COLLISIONS
    collision_init(scene_173_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_173_1
    load_vram(0x5400, actor_sc173_1_spr, ACTOR_SCENE_173_1_VRAM_SIZE);
    load_palette(17, actor_sc173_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_173_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_173_1_X, ACTOR_SCENE_173_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_174
  else if (scene_num == 174) {
#ifdef SCENE_174_TYPE
    g_current_scene_type = SCENE_174_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene174_chr, bg_scene174_pal, bg_scene174_bat, 32, 28);
#ifdef HAS_SCENE_174_COLLISIONS
    collision_init(scene_174_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_174_1
    load_vram(0x5400, actor_sc174_1_spr, ACTOR_SCENE_174_1_VRAM_SIZE);
    load_palette(17, actor_sc174_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_174_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_174_1_X, ACTOR_SCENE_174_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_175
  else if (scene_num == 175) {
#ifdef SCENE_175_TYPE
    g_current_scene_type = SCENE_175_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene175_chr, bg_scene175_pal, bg_scene175_bat, 32, 28);
#ifdef HAS_SCENE_175_COLLISIONS
    collision_init(scene_175_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_175_1
    load_vram(0x5400, actor_sc175_1_spr, ACTOR_SCENE_175_1_VRAM_SIZE);
    load_palette(17, actor_sc175_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_175_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_175_1_X, ACTOR_SCENE_175_1_Y);
    }
#endif
  }
#endif

}

void load_scene_part8(int scene_num) {
#ifdef HAS_SCENE_176
  if (scene_num == 176) {
#ifdef SCENE_176_TYPE
    g_current_scene_type = SCENE_176_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene176_chr, bg_scene176_pal, bg_scene176_bat, 32, 28);
#ifdef HAS_SCENE_176_COLLISIONS
    collision_init(scene_176_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_176_1
    load_vram(0x5400, actor_sc176_1_spr, ACTOR_SCENE_176_1_VRAM_SIZE);
    load_palette(17, actor_sc176_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_176_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_176_1_X, ACTOR_SCENE_176_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_177
  else if (scene_num == 177) {
#ifdef SCENE_177_TYPE
    g_current_scene_type = SCENE_177_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene177_chr, bg_scene177_pal, bg_scene177_bat, 32, 28);
#ifdef HAS_SCENE_177_COLLISIONS
    collision_init(scene_177_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_177_1
    load_vram(0x5400, actor_sc177_1_spr, ACTOR_SCENE_177_1_VRAM_SIZE);
    load_palette(17, actor_sc177_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_177_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_177_1_X, ACTOR_SCENE_177_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_178
  else if (scene_num == 178) {
#ifdef SCENE_178_TYPE
    g_current_scene_type = SCENE_178_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene178_chr, bg_scene178_pal, bg_scene178_bat, 32, 28);
#ifdef HAS_SCENE_178_COLLISIONS
    collision_init(scene_178_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_178_1
    load_vram(0x5400, actor_sc178_1_spr, ACTOR_SCENE_178_1_VRAM_SIZE);
    load_palette(17, actor_sc178_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_178_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_178_1_X, ACTOR_SCENE_178_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_179
  else if (scene_num == 179) {
#ifdef SCENE_179_TYPE
    g_current_scene_type = SCENE_179_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene179_chr, bg_scene179_pal, bg_scene179_bat, 32, 28);
#ifdef HAS_SCENE_179_COLLISIONS
    collision_init(scene_179_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_179_1
    load_vram(0x5400, actor_sc179_1_spr, ACTOR_SCENE_179_1_VRAM_SIZE);
    load_palette(17, actor_sc179_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_179_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_179_1_X, ACTOR_SCENE_179_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_180
  else if (scene_num == 180) {
#ifdef SCENE_180_TYPE
    g_current_scene_type = SCENE_180_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene180_chr, bg_scene180_pal, bg_scene180_bat, 32, 28);
#ifdef HAS_SCENE_180_COLLISIONS
    collision_init(scene_180_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_180_1
    load_vram(0x5400, actor_sc180_1_spr, ACTOR_SCENE_180_1_VRAM_SIZE);
    load_palette(17, actor_sc180_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_180_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_180_1_X, ACTOR_SCENE_180_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_181
  else if (scene_num == 181) {
#ifdef SCENE_181_TYPE
    g_current_scene_type = SCENE_181_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene181_chr, bg_scene181_pal, bg_scene181_bat, 32, 28);
#ifdef HAS_SCENE_181_COLLISIONS
    collision_init(scene_181_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_181_1
    load_vram(0x5400, actor_sc181_1_spr, ACTOR_SCENE_181_1_VRAM_SIZE);
    load_palette(17, actor_sc181_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_181_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_181_1_X, ACTOR_SCENE_181_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_182
  else if (scene_num == 182) {
#ifdef SCENE_182_TYPE
    g_current_scene_type = SCENE_182_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene182_chr, bg_scene182_pal, bg_scene182_bat, 32, 28);
#ifdef HAS_SCENE_182_COLLISIONS
    collision_init(scene_182_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_182_1
    load_vram(0x5400, actor_sc182_1_spr, ACTOR_SCENE_182_1_VRAM_SIZE);
    load_palette(17, actor_sc182_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_182_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_182_1_X, ACTOR_SCENE_182_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_183
  else if (scene_num == 183) {
#ifdef SCENE_183_TYPE
    g_current_scene_type = SCENE_183_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene183_chr, bg_scene183_pal, bg_scene183_bat, 32, 28);
#ifdef HAS_SCENE_183_COLLISIONS
    collision_init(scene_183_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_183_1
    load_vram(0x5400, actor_sc183_1_spr, ACTOR_SCENE_183_1_VRAM_SIZE);
    load_palette(17, actor_sc183_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_183_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_183_1_X, ACTOR_SCENE_183_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_184
  else if (scene_num == 184) {
#ifdef SCENE_184_TYPE
    g_current_scene_type = SCENE_184_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene184_chr, bg_scene184_pal, bg_scene184_bat, 32, 28);
#ifdef HAS_SCENE_184_COLLISIONS
    collision_init(scene_184_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_184_1
    load_vram(0x5400, actor_sc184_1_spr, ACTOR_SCENE_184_1_VRAM_SIZE);
    load_palette(17, actor_sc184_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_184_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_184_1_X, ACTOR_SCENE_184_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_185
  else if (scene_num == 185) {
#ifdef SCENE_185_TYPE
    g_current_scene_type = SCENE_185_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene185_chr, bg_scene185_pal, bg_scene185_bat, 32, 28);
#ifdef HAS_SCENE_185_COLLISIONS
    collision_init(scene_185_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_185_1
    load_vram(0x5400, actor_sc185_1_spr, ACTOR_SCENE_185_1_VRAM_SIZE);
    load_palette(17, actor_sc185_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_185_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_185_1_X, ACTOR_SCENE_185_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_186
  else if (scene_num == 186) {
#ifdef SCENE_186_TYPE
    g_current_scene_type = SCENE_186_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene186_chr, bg_scene186_pal, bg_scene186_bat, 32, 28);
#ifdef HAS_SCENE_186_COLLISIONS
    collision_init(scene_186_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_186_1
    load_vram(0x5400, actor_sc186_1_spr, ACTOR_SCENE_186_1_VRAM_SIZE);
    load_palette(17, actor_sc186_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_186_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_186_1_X, ACTOR_SCENE_186_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_187
  else if (scene_num == 187) {
#ifdef SCENE_187_TYPE
    g_current_scene_type = SCENE_187_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene187_chr, bg_scene187_pal, bg_scene187_bat, 32, 28);
#ifdef HAS_SCENE_187_COLLISIONS
    collision_init(scene_187_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_187_1
    load_vram(0x5400, actor_sc187_1_spr, ACTOR_SCENE_187_1_VRAM_SIZE);
    load_palette(17, actor_sc187_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_187_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_187_1_X, ACTOR_SCENE_187_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_188
  else if (scene_num == 188) {
#ifdef SCENE_188_TYPE
    g_current_scene_type = SCENE_188_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene188_chr, bg_scene188_pal, bg_scene188_bat, 32, 28);
#ifdef HAS_SCENE_188_COLLISIONS
    collision_init(scene_188_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_188_1
    load_vram(0x5400, actor_sc188_1_spr, ACTOR_SCENE_188_1_VRAM_SIZE);
    load_palette(17, actor_sc188_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_188_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_188_1_X, ACTOR_SCENE_188_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_189
  else if (scene_num == 189) {
#ifdef SCENE_189_TYPE
    g_current_scene_type = SCENE_189_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene189_chr, bg_scene189_pal, bg_scene189_bat, 32, 28);
#ifdef HAS_SCENE_189_COLLISIONS
    collision_init(scene_189_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_189_1
    load_vram(0x5400, actor_sc189_1_spr, ACTOR_SCENE_189_1_VRAM_SIZE);
    load_palette(17, actor_sc189_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_189_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_189_1_X, ACTOR_SCENE_189_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_190
  else if (scene_num == 190) {
#ifdef SCENE_190_TYPE
    g_current_scene_type = SCENE_190_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene190_chr, bg_scene190_pal, bg_scene190_bat, 32, 28);
#ifdef HAS_SCENE_190_COLLISIONS
    collision_init(scene_190_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_190_1
    load_vram(0x5400, actor_sc190_1_spr, ACTOR_SCENE_190_1_VRAM_SIZE);
    load_palette(17, actor_sc190_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_190_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_190_1_X, ACTOR_SCENE_190_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_191
  else if (scene_num == 191) {
#ifdef SCENE_191_TYPE
    g_current_scene_type = SCENE_191_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene191_chr, bg_scene191_pal, bg_scene191_bat, 32, 28);
#ifdef HAS_SCENE_191_COLLISIONS
    collision_init(scene_191_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_191_1
    load_vram(0x5400, actor_sc191_1_spr, ACTOR_SCENE_191_1_VRAM_SIZE);
    load_palette(17, actor_sc191_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_191_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_191_1_X, ACTOR_SCENE_191_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_192
  else if (scene_num == 192) {
#ifdef SCENE_192_TYPE
    g_current_scene_type = SCENE_192_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene192_chr, bg_scene192_pal, bg_scene192_bat, 32, 28);
#ifdef HAS_SCENE_192_COLLISIONS
    collision_init(scene_192_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_192_1
    load_vram(0x5400, actor_sc192_1_spr, ACTOR_SCENE_192_1_VRAM_SIZE);
    load_palette(17, actor_sc192_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_192_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_192_1_X, ACTOR_SCENE_192_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_193
  else if (scene_num == 193) {
#ifdef SCENE_193_TYPE
    g_current_scene_type = SCENE_193_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene193_chr, bg_scene193_pal, bg_scene193_bat, 32, 28);
#ifdef HAS_SCENE_193_COLLISIONS
    collision_init(scene_193_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_193_1
    load_vram(0x5400, actor_sc193_1_spr, ACTOR_SCENE_193_1_VRAM_SIZE);
    load_palette(17, actor_sc193_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_193_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_193_1_X, ACTOR_SCENE_193_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_194
  else if (scene_num == 194) {
#ifdef SCENE_194_TYPE
    g_current_scene_type = SCENE_194_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene194_chr, bg_scene194_pal, bg_scene194_bat, 32, 28);
#ifdef HAS_SCENE_194_COLLISIONS
    collision_init(scene_194_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_194_1
    load_vram(0x5400, actor_sc194_1_spr, ACTOR_SCENE_194_1_VRAM_SIZE);
    load_palette(17, actor_sc194_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_194_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_194_1_X, ACTOR_SCENE_194_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_195
  else if (scene_num == 195) {
#ifdef SCENE_195_TYPE
    g_current_scene_type = SCENE_195_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene195_chr, bg_scene195_pal, bg_scene195_bat, 32, 28);
#ifdef HAS_SCENE_195_COLLISIONS
    collision_init(scene_195_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_195_1
    load_vram(0x5400, actor_sc195_1_spr, ACTOR_SCENE_195_1_VRAM_SIZE);
    load_palette(17, actor_sc195_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_195_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_195_1_X, ACTOR_SCENE_195_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_196
  else if (scene_num == 196) {
#ifdef SCENE_196_TYPE
    g_current_scene_type = SCENE_196_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene196_chr, bg_scene196_pal, bg_scene196_bat, 32, 28);
#ifdef HAS_SCENE_196_COLLISIONS
    collision_init(scene_196_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_196_1
    load_vram(0x5400, actor_sc196_1_spr, ACTOR_SCENE_196_1_VRAM_SIZE);
    load_palette(17, actor_sc196_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_196_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_196_1_X, ACTOR_SCENE_196_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_197
  else if (scene_num == 197) {
#ifdef SCENE_197_TYPE
    g_current_scene_type = SCENE_197_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene197_chr, bg_scene197_pal, bg_scene197_bat, 32, 28);
#ifdef HAS_SCENE_197_COLLISIONS
    collision_init(scene_197_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_197_1
    load_vram(0x5400, actor_sc197_1_spr, ACTOR_SCENE_197_1_VRAM_SIZE);
    load_palette(17, actor_sc197_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_197_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_197_1_X, ACTOR_SCENE_197_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_198
  else if (scene_num == 198) {
#ifdef SCENE_198_TYPE
    g_current_scene_type = SCENE_198_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene198_chr, bg_scene198_pal, bg_scene198_bat, 32, 28);
#ifdef HAS_SCENE_198_COLLISIONS
    collision_init(scene_198_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_198_1
    load_vram(0x5400, actor_sc198_1_spr, ACTOR_SCENE_198_1_VRAM_SIZE);
    load_palette(17, actor_sc198_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_198_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_198_1_X, ACTOR_SCENE_198_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_199
  else if (scene_num == 199) {
#ifdef SCENE_199_TYPE
    g_current_scene_type = SCENE_199_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene199_chr, bg_scene199_pal, bg_scene199_bat, 32, 28);
#ifdef HAS_SCENE_199_COLLISIONS
    collision_init(scene_199_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_199_1
    load_vram(0x5400, actor_sc199_1_spr, ACTOR_SCENE_199_1_VRAM_SIZE);
    load_palette(17, actor_sc199_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_199_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_199_1_X, ACTOR_SCENE_199_1_Y);
    }
#endif
  }
#endif

#ifdef HAS_SCENE_200
  else if (scene_num == 200) {
#ifdef SCENE_200_TYPE
    g_current_scene_type = SCENE_200_TYPE;
#else
    g_current_scene_type = SCENE_1_TYPE;
#endif
    load_background(bg_scene200_chr, bg_scene200_pal, bg_scene200_bat, 32, 28);
#ifdef HAS_SCENE_200_COLLISIONS
    collision_init(scene_200_collisions, 32, 28);
#else
    collision_init(scene_1_collisions, 32, 28);
#endif

#ifdef HAS_ACTOR_SCENE_200_1
    load_vram(0x5400, actor_sc200_1_spr, ACTOR_SCENE_200_1_VRAM_SIZE);
    load_palette(17, actor_sc200_1_pal, 1);
    if (g_actor_count > 1) {
      g_actor_active[1] = 1;
      g_actor_tile_id[1] = 0x5400;
      g_actor_palette[1] = 1;
      g_actor_size[1] = ACTOR_SCENE_200_1_SPRITE_SIZE;
      actor_set_pos(1, ACTOR_SCENE_200_1_X, ACTOR_SCENE_200_1_Y);
    }
#endif
  }
#endif

}

void load_scene(int scene_num, int player_x, int player_y) {
  int i;
  hide_dialogue();
  g_current_scene = scene_num;

  for (i = 0; i < PCE_MAX_ACTORS; i++) {
    g_actor_hidden[i] = 0;
  }
  for (i = 1; i < PCE_MAX_ACTORS; i++) {
    g_actor_active[i] = 0;
  }

  load_scene_player_sprite(scene_num);

  if (g_actor_count > 0) {
    g_actor_active[0] = 1;
    g_actor_palette[0] = 0;
    g_actor_size[0] = g_player_spr_size;
    if (g_current_scene_type == SCENE_TYPE_PLATFORM) {
      if (g_actor_dir[0] != DIR_LEFT && g_actor_dir[0] != DIR_RIGHT) {
        g_actor_dir[0] = DIR_RIGHT;
      }
    }
    g_actor_tile_id[0] = 0x5000 + g_actor_dir[0] * 2 * g_player_spr_vram_size;
    actor_set_pos(0, player_x, player_y);
  }

  if (scene_num <= 25) {
    load_scene_part1(scene_num);
  } else if (scene_num <= 50) {
    load_scene_part2(scene_num);
  } else if (scene_num <= 75) {
    load_scene_part3(scene_num);
  } else if (scene_num <= 100) {
    load_scene_part4(scene_num);
  } else if (scene_num <= 125) {
    load_scene_part5(scene_num);
  } else if (scene_num <= 150) {
    load_scene_part6(scene_num);
  } else if (scene_num <= 175) {
    load_scene_part7(scene_num);
  } else {
    load_scene_part8(scene_num);
  }

  g_plat_sub_x = player_x * 8;
  g_plat_sub_y = player_y * 8;
  g_plat_vy = 0;
  g_plat_on_ground = 0;
  g_shmup_scroll_x = 0;

  if (g_actor_count > 0) {
    actor_set_pos(0, player_x, player_y);
  }

  g_script_scene = scene_num;
  g_script_step = 0;
  g_wait_timer = 0;

  load_scene_music(scene_num);
}

const unsigned int font_pal[16] = {
    0x1FF, /* 0: White background */
    0x000, /* 1: Pure black text */
    0x000, 0x000, 0x000, 0x000, 0x000, 0x000,
    0x000, 0x000, 0x000, 0x000, 0x000, 0x000, 0x000, 0x000
};

void engine_init(void) {
  int i;
  pce_sys_init();
  pce_sound_init();
#ifdef HAS_MUSIC_DATA
#ifdef START_MUSIC_DATA
  pce_sound_play(START_MUSIC_DATA);
#endif
#endif
  actor_init();
  camera_init();
  trigger_init();
  vm_init();

  set_font_pal(15);
  set_font_color(1, 2);
  load_default_font();
  set_color(241, 0x000);
  set_color(242, 0x1FF);

  trigger_load_all();

#ifndef PLAYER_SPR_VRAM_SIZE
#define PLAYER_SPR_VRAM_SIZE 0x40
#endif
#ifndef PLAYER_SPR_SIZE
#define PLAYER_SPR_SIZE SZ_16x16
#endif

  load_scene_player_sprite(START_SCENE_NUM);

  actor_spawn(PLAYER_START_X, PLAYER_START_Y, 0x5000, 0, g_player_spr_size);

  actor_spawn(0, 0, 0x5400, 1, SZ_16x16);
  actor_spawn(0, 0, 0x5600, 2, SZ_16x16);

#ifdef START_SCENE_NUM
  load_scene(START_SCENE_NUM, PLAYER_START_X, PLAYER_START_Y);
#else
  load_scene(1, PLAYER_START_X, PLAYER_START_Y);
#endif
}

int g_dialogue_active = 0;
int g_dialogue_timer = 0;

void show_dialogue(const char *msg) {
  int i;
  char line_buf[33];
  const char *p;

  if (!msg || !*msg)
    return;

  g_dialogue_active = 1;
  g_dialogue_timer = 180;
  actor_update_all();
  satb_update();

  set_font_pal(15);
  set_color(241, 0x000);
  set_color(242, 0x1FF);

  /* Top border at y = 22 */
  line_buf[0] = '+';
  for (i = 1; i <= 30; i++) line_buf[i] = '-';
  line_buf[31] = '+';
  line_buf[32] = '\0';
  put_string(line_buf, 0, 22);

  /* Text line 1 at y = 23 */
  line_buf[0] = '|';
  p = msg;
  for (i = 1; i <= 30; i++) {
    if (*p && *p != '\n') {
      line_buf[i] = *p++;
    } else {
      line_buf[i] = ' ';
    }
  }
  line_buf[31] = '|';
  line_buf[32] = '\0';
  put_string(line_buf, 0, 23);

  /* Text line 2 at y = 24 */
  line_buf[0] = '|';
  if (*p == '\n') p++;
  for (i = 1; i <= 30; i++) {
    if (*p && *p != '\n') {
      line_buf[i] = *p++;
    } else {
      line_buf[i] = ' ';
    }
  }
  line_buf[31] = '|';
  line_buf[32] = '\0';
  put_string(line_buf, 0, 24);

  /* Text line 3 at y = 25 */
  line_buf[0] = '|';
  if (*p == '\n') p++;
  for (i = 1; i <= 30; i++) {
    if (*p && *p != '\n') {
      line_buf[i] = *p++;
    } else {
      line_buf[i] = ' ';
    }
  }
  if (line_buf[30] == ' ') line_buf[30] = 'v';
  line_buf[31] = '|';
  line_buf[32] = '\0';
  put_string(line_buf, 0, 25);

  /* Bottom border at y = 26 */
  line_buf[0] = '+';
  for (i = 1; i <= 30; i++) line_buf[i] = '-';
  line_buf[31] = '+';
  line_buf[32] = '\0';
  put_string(line_buf, 0, 26);
}

void hide_dialogue(void) {
  if (g_dialogue_active) {
    g_dialogue_active = 0;
    g_dialogue_timer = 0;
    load_scene_background(g_current_scene);
    actor_update_all();
    satb_update();
  }
}

static unsigned int g_last_input = 0;

void check_actor_interaction(unsigned int input) {
  int dx, dy, i;
  unsigned int pressed;
  pressed = input & ~g_last_input;
  g_last_input = input;

  if (g_dialogue_active) {
    if (pressed & (JOY_I | JOY_II | JOY_A | JOY_B | JOY_STRT | JOY_SEL)) {
      hide_dialogue();
    }
    return;
  }

  if (pressed & (JOY_I | JOY_II)) {
    for (i = 1; i < g_actor_count; i++) {
      if (g_actor_active[i]) {
        dx = g_actor_x[0] - g_actor_x[i];
        dy = g_actor_y[0] - g_actor_y[i];
        if (dx < 0)
          dx = -dx;
        if (dy < 0)
          dy = -dy;
        if (dx <= 24 && dy <= 24) {
          if (g_current_scene == 1) {
              if (i == 1) {
#ifdef ACTOR_SCENE_1_1_TEXT
                show_dialogue(ACTOR_SCENE_1_1_TEXT);
#else
#ifdef ACTOR_SCENE_1_TEXT
                show_dialogue(ACTOR_SCENE_1_TEXT);
#endif
#endif

#ifdef ACTOR_SCENE_1_1_SHOW_ACTOR_0
                actor_show(0);
#endif
#ifdef ACTOR_SCENE_1_1_SHOW_ACTOR_1
                actor_show(1);
#endif
#ifdef ACTOR_SCENE_1_1_SHOW_ACTOR_2
                actor_show(2);
#endif
#ifdef ACTOR_SCENE_1_1_SHOW_ACTOR_3
                actor_show(3);
#endif

#ifdef ACTOR_SCENE_1_1_HIDE_ACTOR_0
                actor_hide(0);
#endif
#ifdef ACTOR_SCENE_1_1_HIDE_ACTOR_1
                actor_hide(1);
#endif
#ifdef ACTOR_SCENE_1_1_HIDE_ACTOR_2
                actor_hide(2);
#endif
#ifdef ACTOR_SCENE_1_1_HIDE_ACTOR_3
                actor_hide(3);
#endif
              } else if (i == 2) {
#ifdef ACTOR_SCENE_1_2_TEXT
                show_dialogue(ACTOR_SCENE_1_2_TEXT);
#endif

#ifdef ACTOR_SCENE_1_2_SHOW_ACTOR_0
                actor_show(0);
#endif
#ifdef ACTOR_SCENE_1_2_SHOW_ACTOR_1
                actor_show(1);
#endif
#ifdef ACTOR_SCENE_1_2_SHOW_ACTOR_2
                actor_show(2);
#endif
#ifdef ACTOR_SCENE_1_2_SHOW_ACTOR_3
                actor_show(3);
#endif

#ifdef ACTOR_SCENE_1_2_HIDE_ACTOR_0
                actor_hide(0);
#endif
#ifdef ACTOR_SCENE_1_2_HIDE_ACTOR_1
                actor_hide(1);
#endif
#ifdef ACTOR_SCENE_1_2_HIDE_ACTOR_2
                actor_hide(2);
#endif
#ifdef ACTOR_SCENE_1_2_HIDE_ACTOR_3
                actor_hide(3);
#endif
              }
            }
#ifdef HAS_SCENE_2
            else if (g_current_scene == 2) {
              if (i == 1) {
#ifdef ACTOR_SCENE_2_1_TEXT
                show_dialogue(ACTOR_SCENE_2_1_TEXT);
#else
#ifdef ACTOR_SCENE_2_TEXT
                show_dialogue(ACTOR_SCENE_2_TEXT);
#endif
#endif

#ifdef ACTOR_SCENE_2_1_SHOW_ACTOR_0
                actor_show(0);
#endif
#ifdef ACTOR_SCENE_2_1_SHOW_ACTOR_1
                actor_show(1);
#endif
#ifdef ACTOR_SCENE_2_1_SHOW_ACTOR_2
                actor_show(2);
#endif
#ifdef ACTOR_SCENE_2_1_SHOW_ACTOR_3
                actor_show(3);
#endif

#ifdef ACTOR_SCENE_2_1_HIDE_ACTOR_0
                actor_hide(0);
#endif
#ifdef ACTOR_SCENE_2_1_HIDE_ACTOR_1
                actor_hide(1);
#endif
#ifdef ACTOR_SCENE_2_1_HIDE_ACTOR_2
                actor_hide(2);
#endif
#ifdef ACTOR_SCENE_2_1_HIDE_ACTOR_3
                actor_hide(3);
#endif
              } else if (i == 2) {
#ifdef ACTOR_SCENE_2_2_TEXT
                show_dialogue(ACTOR_SCENE_2_2_TEXT);
#endif

#ifdef ACTOR_SCENE_2_2_SHOW_ACTOR_0
                actor_show(0);
#endif
#ifdef ACTOR_SCENE_2_2_SHOW_ACTOR_1
                actor_show(1);
#endif
#ifdef ACTOR_SCENE_2_2_SHOW_ACTOR_2
                actor_show(2);
#endif
#ifdef ACTOR_SCENE_2_2_SHOW_ACTOR_3
                actor_show(3);
#endif

#ifdef ACTOR_SCENE_2_2_HIDE_ACTOR_0
                actor_hide(0);
#endif
#ifdef ACTOR_SCENE_2_2_HIDE_ACTOR_1
                actor_hide(1);
#endif
#ifdef ACTOR_SCENE_2_2_HIDE_ACTOR_2
                actor_hide(2);
#endif
#ifdef ACTOR_SCENE_2_2_HIDE_ACTOR_3
                actor_hide(3);
#endif
              }
            }
#endif
          break;
        }
      }
    }
  }
}

int g_player_anim_timer = 0;
int g_player_anim_frame = 0;

void update_player_anim(int is_moving) {
  int dir;
  int base_vram;
  dir = g_actor_dir[0];
  if (is_moving) {
    g_player_anim_timer++;
    if (g_player_anim_timer >= 8) {
      g_player_anim_timer = 0;
      g_player_anim_frame = 1 - g_player_anim_frame;
    }
  } else {
    g_player_anim_timer = 0;
    g_player_anim_frame = 0;
  }

#ifdef HAS_PLAYER_4DIR
  /* dir: 0=Right, 1=Left, 2=Up, 3=Down */
  g_actor_tile_id[0] = 0x5000 + (dir * 2 + g_player_anim_frame) * g_player_spr_vram_size;
#else
#ifdef HAS_PLAYER_FRAME_1
  base_vram = (dir == 1) ? (0x5000 + 2 * g_player_spr_vram_size) : 0x5000;
  if (g_player_anim_frame == 1) {
    g_actor_tile_id[0] = base_vram + g_player_spr_vram_size;
  } else {
    g_actor_tile_id[0] = base_vram;
  }
#else
  base_vram = (dir == 1) ? (0x5000 + g_player_spr_vram_size) : 0x5000;
  g_actor_tile_id[0] = base_vram;
#endif
#endif
}

void update_topdown(void) {
  unsigned int input;
  int dx, dy, new_x, new_y;

  input = pce_sys_read_joy(0);
  check_actor_interaction(input);
  if (g_dialogue_active) {
    update_player_anim(0);
    actor_update_all();
    return;
  }
  if (g_actor_count > 0 && g_actor_active[0]) {
    dx = 0;
    dy = 0;
    if (input & JOY_LEFT) {
      dx -= TOPDOWN_SPEED;
      g_actor_dir[0] = DIR_LEFT;
    } else if (input & JOY_RIGHT) {
      dx += TOPDOWN_SPEED;
      g_actor_dir[0] = DIR_RIGHT;
    } else if (input & JOY_UP) {
      dy -= TOPDOWN_SPEED;
      g_actor_dir[0] = DIR_UP;
    } else if (input & JOY_DOWN) {
      dy += TOPDOWN_SPEED;
      g_actor_dir[0] = DIR_DOWN;
    }

    update_player_anim(dx != 0 || dy != 0);

    new_x = g_actor_x[0] + dx;
    if (!collision_check_box(new_x, g_actor_y[0])) {
      g_actor_x[0] = new_x;
    }

    new_y = g_actor_y[0] + dy;
    if (!collision_check_box(g_actor_x[0], new_y)) {
      g_actor_y[0] = new_y;
    }

    camera_update(g_actor_x[0], g_actor_y[0]);
    trigger_check(g_actor_x[0], g_actor_y[0]);
  }
}

void update_platform(void) {
  unsigned int input;
  int dx_sub, new_sub_x, new_x;
  int new_sub_y, new_y;

  input = pce_sys_read_joy(0);
  check_actor_interaction(input);
  if (g_dialogue_active) {
    update_player_anim(0);
    actor_update_all();
    return;
  }
  if (g_actor_count > 0 && g_actor_active[0]) {
    dx_sub = 0;
    if (input & JOY_LEFT) {
      dx_sub -= PLAT_WALK_SUBPX;
      g_actor_dir[0] = 1;
    }
    if (input & JOY_RIGHT) {
      dx_sub += PLAT_WALK_SUBPX;
      g_actor_dir[0] = 0;
    }

    update_player_anim(dx_sub != 0 || !g_plat_on_ground);

    if (dx_sub != 0) {
      new_sub_x = g_plat_sub_x + dx_sub;
      new_x = new_sub_x >> 3;
      if (!collision_check_box(new_x, g_actor_y[0])) {
        g_plat_sub_x = new_sub_x;
        g_actor_x[0] = new_x;
      }
    } else {
      g_plat_sub_x = g_actor_x[0] * 8;
    }

    if ((input & JOY_II) && g_plat_on_ground) {
      g_plat_vy = -PLAT_JUMP_SUBPX;
      g_plat_on_ground = 0;
    }

    g_plat_vy += PLAT_GRAVITY;
    if (g_plat_vy > PLAT_MAX_FALL)
      g_plat_vy = PLAT_MAX_FALL;

    new_sub_y = g_plat_sub_y + g_plat_vy;
    new_y = new_sub_y >> 3;
    if (!collision_check_box(g_actor_x[0], new_y)) {
      g_plat_sub_y = new_sub_y;
      g_actor_y[0] = new_y;
      g_plat_on_ground = 0;
    } else {
      if (g_plat_vy > 0) {
        g_plat_on_ground = 1;
      }
      g_plat_vy = 0;
      g_plat_sub_y = g_actor_y[0] * 8;
    }

    camera_update_x(g_actor_x[0]);
    trigger_check(g_actor_x[0], g_actor_y[0]);
  }
}

void update_adventure(void) {
  unsigned int input;
  int dx, dy, new_x, new_y;

  input = pce_sys_read_joy(0);
  check_actor_interaction(input);
  if (g_actor_count > 0 && g_actor_active[0]) {
    dx = 0;
    dy = 0;
    if (input & JOY_LEFT) {
      dx -= ADVENTURE_SPEED;
      g_actor_dir[0] = 1;
    }
    if (input & JOY_RIGHT) {
      dx += ADVENTURE_SPEED;
      g_actor_dir[0] = 0;
    }
    if (input & JOY_UP)
      dy -= ADVENTURE_SPEED;
    if (input & JOY_DOWN)
      dy += ADVENTURE_SPEED;

    update_player_anim(dx != 0 || dy != 0);

    new_x = g_actor_x[0] + dx;
    if (!collision_check_box(new_x, g_actor_y[0])) {
      g_actor_x[0] = new_x;
    }

    new_y = g_actor_y[0] + dy;
    if (!collision_check_box(g_actor_x[0], new_y)) {
      g_actor_y[0] = new_y;
    }

    camera_update(g_actor_x[0], g_actor_y[0]);
    trigger_check(g_actor_x[0], g_actor_y[0]);
  }
}

void update_shmup(void) {
  unsigned int input;
  int dx, dy, new_x, new_y;

  g_shmup_scroll_x += SHMUP_SCROLL_SPEED;
  g_cam_x = g_shmup_scroll_x;

  input = pce_sys_read_joy(0);
  check_actor_interaction(input);
  if (g_actor_count > 0 && g_actor_active[0]) {
    dx = 0;
    dy = 0;
    if (input & JOY_LEFT) {
      dx -= SHMUP_PLAYER_SPEED;
      g_actor_dir[0] = 1;
    }
    if (input & JOY_RIGHT) {
      dx += SHMUP_PLAYER_SPEED;
      g_actor_dir[0] = 0;
    }
    if (input & JOY_UP)
      dy -= SHMUP_PLAYER_SPEED;
    if (input & JOY_DOWN)
      dy += SHMUP_PLAYER_SPEED;

    update_player_anim(dx != 0 || dy != 0);

    new_x = g_actor_x[0] + dx;
    if (new_x >= g_cam_x && new_x <= g_cam_x + PCE_SCREEN_WIDTH_PX - 16) {
      if (!collision_check_box(new_x, g_actor_y[0])) {
        g_actor_x[0] = new_x;
      }
    }

    new_y = g_actor_y[0] + dy;
    if (new_y >= 0 && new_y <= PCE_SCREEN_HEIGHT_PX - 16) {
      if (!collision_check_box(g_actor_x[0], new_y)) {
        g_actor_y[0] = new_y;
      }
    }

    trigger_check(g_actor_x[0], g_actor_y[0]);
  }
}

void update_pointnclick(void) {
  int dummy;
  dummy = 0;
}

void update_logo(void) {
  int dummy;
  dummy = 0;
}

void engine_update(void) {
  vm_step();
  pce_sound_update();

  if (g_dialogue_active) {
    if (g_dialogue_timer > 0) {
      g_dialogue_timer--;
      if (g_dialogue_timer == 0) {
        hide_dialogue();
      }
    }
  }

  if (g_script_step >= 0) {
    if (g_wait_timer > 0) {
      g_wait_timer--;
    } else if (!g_dialogue_active) {
      g_script_step = run_scene_step(g_script_scene, g_script_step);
    }
  }

  if (g_current_scene_type == SCENE_TYPE_PLATFORM) {
    update_platform();
  } else if (g_current_scene_type == SCENE_TYPE_ADVENTURE) {
    update_adventure();
  } else if (g_current_scene_type == SCENE_TYPE_SHMUP) {
    update_shmup();
  } else if (g_current_scene_type == SCENE_TYPE_POINTNCLICK) {
    update_pointnclick();
  } else if (g_current_scene_type == SCENE_TYPE_LOGO) {
    update_logo();
  } else {
    update_topdown();
  }
}

void engine_render(void) {
  camera_apply();
  actor_update_all();
  pce_sys_vsync();
}

void engine_run(void) {
  engine_init();
  for (;;) {
    engine_update();
    engine_render();
  }
}
