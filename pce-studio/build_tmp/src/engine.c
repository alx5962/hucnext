#include "include/engine.h"
#include "include/pce_sound.h"

#ifndef PLAYER_START_X
#define PLAYER_START_X 104
#endif

#ifndef PLAYER_START_Y
#define PLAYER_START_Y 112
#endif

int g_current_scene = 1;
int g_current_scene_type = SCENE_1_TYPE;

int g_plat_sub_x = 0;
int g_plat_sub_y = 0;
int g_plat_vy = 0;
int g_plat_on_ground = 0;
int g_shmup_scroll_x = 0;

void load_scene(int scene_num, int player_x, int player_y) {
    g_current_scene = scene_num;

    if (scene_num == 1) {
        g_current_scene_type = SCENE_1_TYPE;
        load_background(bg_scene1_chr, bg_scene1_pal, bg_scene1_bat, 32, 28);
        collision_init(scene_1_collisions, 32, 28);
        #ifdef HAS_ACTOR_SCENE_1
        load_vram(0x5400, actor_sc1_spr, ACTOR_SCENE_1_VRAM_SIZE);
        load_palette(17, actor_sc1_pal, 1);
        if (g_actor_count > 1) {
            g_actor_active[1] = 1;
            g_actor_tile_id[1] = 0x5400;
            g_actor_palette[1] = 1;
            g_actor_size[1] = ACTOR_SCENE_1_SPRITE_SIZE;
            actor_set_pos(1, ACTOR_SCENE_1_X, ACTOR_SCENE_1_Y);
        }
        #else
        if (g_actor_count > 1) {
            g_actor_active[1] = 0;
        }
        #endif
    }
    #ifdef HAS_SCENE_2
    else if (scene_num == 2) {
        g_current_scene_type = SCENE_2_TYPE;
        load_background(bg_scene2_chr, bg_scene2_pal, bg_scene2_bat, 32, 28);
        collision_init(scene_2_collisions, 32, 28);
        #ifdef HAS_ACTOR_SCENE_2
        load_vram(0x5400, actor_sc2_spr, ACTOR_SCENE_2_VRAM_SIZE);
        load_palette(17, actor_sc2_pal, 1);
        if (g_actor_count > 1) {
            g_actor_active[1] = 1;
            g_actor_tile_id[1] = 0x5400;
            g_actor_palette[1] = 1;
            g_actor_size[1] = ACTOR_SCENE_2_SPRITE_SIZE;
            actor_set_pos(1, ACTOR_SCENE_2_X, ACTOR_SCENE_2_Y);
        }
        #else
        if (g_actor_count > 1) {
            g_actor_active[1] = 0;
        }
        #endif
    }
    #endif

    g_plat_sub_x = player_x * 8;
    g_plat_sub_y = player_y * 8;
    g_plat_vy = 0;
    g_plat_on_ground = 0;
    g_shmup_scroll_x = 0;

    if (g_actor_count > 0) {
        actor_set_pos(0, player_x, player_y);
    }
}

const unsigned int font_pal[16] = {
    0x000, 0x1FF, 0x1FF, 0x1FF, 0x1FF, 0x1FF, 0x1FF, 0x1FF,
    0x000, 0x1FF, 0x1FF, 0x1FF, 0x1FF, 0x1FF, 0x1FF, 0x1FF
};

void engine_init(void) {
    pce_sys_init();
    pce_sound_init();
    #ifdef HAS_MUSIC_DATA
    pce_sound_play(song_0_Data);
    #endif
    actor_init();
    camera_init();
    trigger_init();
    vm_init();

    set_color(15, 0x1FF);
    set_font_color(0, 15);
    load_default_font();

    #ifdef HAS_TRIGGER_1
    trigger_add(TRIGGER_1_SCENE, TRIGGER_1_X, TRIGGER_1_Y, TRIGGER_1_W, TRIGGER_1_H, TRIGGER_1_TARGET_SCENE, TRIGGER_1_TARGET_X, TRIGGER_1_TARGET_Y, (void*)0);
    #endif

    #ifdef HAS_TRIGGER_2
    trigger_add(TRIGGER_2_SCENE, TRIGGER_2_X, TRIGGER_2_Y, TRIGGER_2_W, TRIGGER_2_H, TRIGGER_2_TARGET_SCENE, TRIGGER_2_TARGET_X, TRIGGER_2_TARGET_Y, (void*)0);
    #endif

    #ifdef HAS_TRIGGER_3
    trigger_add(TRIGGER_3_SCENE, TRIGGER_3_X, TRIGGER_3_Y, TRIGGER_3_W, TRIGGER_3_H, TRIGGER_3_TARGET_SCENE, TRIGGER_3_TARGET_X, TRIGGER_3_TARGET_Y, (void*)0);
    #endif

    #ifdef HAS_TRIGGER_4
    trigger_add(TRIGGER_4_SCENE, TRIGGER_4_X, TRIGGER_4_Y, TRIGGER_4_W, TRIGGER_4_H, TRIGGER_4_TARGET_SCENE, TRIGGER_4_TARGET_X, TRIGGER_4_TARGET_Y, (void*)0);
    #endif

    load_vram(0x5000, player_spr, 0x40);
    load_palette(16, player_pal, 1);

    actor_spawn(PLAYER_START_X, PLAYER_START_Y, 0x5000, 0, SZ_16x16);

    actor_spawn(0, 0, 0x5400, 1, SZ_16x16);

    load_scene(1, PLAYER_START_X, PLAYER_START_Y);
}

int g_dialogue_active = 0;
int g_dialogue_timer = 0;

void show_dialogue(const char* msg) {
    if (!msg || !*msg) return;
    g_dialogue_active = 1;
    g_dialogue_timer = 180;
    set_color(15, 0x1FF);
    set_font_color(0, 15);
    put_string("                    ", 6, 22);
    put_string("                    ", 6, 23);
    put_string(msg, 6, 22);
}

void hide_dialogue(void) {
    if (g_dialogue_active) {
        g_dialogue_active = 0;
        g_dialogue_timer = 0;
        if (g_current_scene == 1) {
            load_background(bg_scene1_chr, bg_scene1_pal, bg_scene1_bat, 32, 28);
        }
        #ifdef HAS_SCENE_2
        else if (g_current_scene == 2) {
            load_background(bg_scene2_chr, bg_scene2_pal, bg_scene2_bat, 32, 28);
        }
        #endif
    }
}

static unsigned int g_last_input = 0;

void check_actor_interaction(unsigned int input) {
    int dx, dy;
    unsigned int pressed;
    pressed = input & ~g_last_input;
    g_last_input = input;

    if (pressed & (JOY_I | JOY_II)) {
        if (g_actor_count > 1 && g_actor_active[1]) {
            dx = g_actor_x[0] - g_actor_x[1];
            dy = g_actor_y[0] - g_actor_y[1];
            if (dx < 0) dx = -dx;
            if (dy < 0) dy = -dy;
            if (dx <= 48 && dy <= 48) {
                if (g_dialogue_active) {
                    hide_dialogue();
                } else {
                    #ifdef HAS_ACTOR_SCENE_1
                    if (g_current_scene == 1) {
                        #ifdef ACTOR_SCENE_1_TEXT
                        show_dialogue(ACTOR_SCENE_1_TEXT);
                        #else
                        show_dialogue("Hello!");
                        #endif
                    }
                    #endif

                    #ifdef HAS_ACTOR_SCENE_2
                    if (g_current_scene == 2) {
                        #ifdef ACTOR_SCENE_2_TEXT
                        show_dialogue(ACTOR_SCENE_2_TEXT);
                        #else
                        show_dialogue("Hello!");
                        #endif
                    }
                    #endif
                }
            }
        }
    }
}

void update_topdown(void) {
    unsigned int input;
    int dx, dy, new_x, new_y;

    input = pce_sys_read_joy(0);
    check_actor_interaction(input);
    if (g_actor_count > 0 && g_actor_active[0]) {
        dx = 0;
        dy = 0;
        if (input & JOY_LEFT)  dx -= TOPDOWN_SPEED;
        if (input & JOY_RIGHT) dx += TOPDOWN_SPEED;
        if (input & JOY_UP)    dy -= TOPDOWN_SPEED;
        if (input & JOY_DOWN)  dy += TOPDOWN_SPEED;

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
    if (g_actor_count > 0 && g_actor_active[0]) {
        dx_sub = 0;
        if (input & JOY_LEFT)  dx_sub -= PLAT_WALK_SUBPX;
        if (input & JOY_RIGHT) dx_sub += PLAT_WALK_SUBPX;

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
        if (g_plat_vy > PLAT_MAX_FALL) g_plat_vy = PLAT_MAX_FALL;

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
        if (input & JOY_LEFT)  dx -= ADVENTURE_SPEED;
        if (input & JOY_RIGHT) dx += ADVENTURE_SPEED;
        if (input & JOY_UP)    dy -= ADVENTURE_SPEED;
        if (input & JOY_DOWN)  dy += ADVENTURE_SPEED;

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
        if (input & JOY_LEFT)  dx -= SHMUP_PLAYER_SPEED;
        if (input & JOY_RIGHT) dx += SHMUP_PLAYER_SPEED;
        if (input & JOY_UP)    dy -= SHMUP_PLAYER_SPEED;
        if (input & JOY_DOWN)  dy += SHMUP_PLAYER_SPEED;

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
