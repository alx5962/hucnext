# PCE Studio Script Events Compilation Status

This document catalogs all **193** events and category tags for the PCE-Studio engine compiler ([`src/lib/compiler/buildProject.ts`](file:///c:/workspace/git/hucnext/pce-studio/src/lib/compiler/buildProject.ts)).

Every script event from the catalog is now recognized by the compiler: **79** events compile into active PCE/HuC C engine calls and state transitions, and **80** events are explicitly handled as step no-ops (`case step: return step + 1;`), with **0 unhandled/dropped** events.

---

## Executive Summary

| Category | Count | Compiler Behavior | Engine Impact |
| :--- | :---: | :--- | :--- |
| **Implemented (Active)** | **79** | Emits functional C code (`case step:` state machine) | Executes gameplay actions (movement, math, flags, dialogue, music, camera, vars, projectiles, screen fades, etc.) |
| **Explicit No-Op (Stubbed)** | **80** | Matched in compiler, emits `case step: return step + 1;` | Consumes a step cycle, safely advances execution (no missing step crashes, traverses children) |
| **Unhandled (Dropped)** | **0** | None | **All 159 script events are now handled** |
| **UI Group Tags** | **34** | Category metadata tags (`EVENT_GROUP_*`) | Used by the UI event picker palette only; not runnable script events |
| **Total Items Analyzed** | **193** | | |

---

## 1. Implemented Events (79 Active Events)

These 79 events compile directly into PCE/HuC C engine functions and state transitions.

| Event Command | PCE Engine Mapping / Generated C Logic |
| :--- | :--- |
| `EVENT_ACTOR_ACTIVATE` | `actor_show(target); actor_activate(target);` |
| `EVENT_ACTOR_COLLISIONS_DISABLE` | `actor_set_collisions(target, 0);` |
| `EVENT_ACTOR_COLLISIONS_ENABLE` | `actor_set_collisions(target, 1);` |
| `EVENT_ACTOR_DEACTIVATE` | `actor_hide(target); actor_deactivate(target);` |
| `EVENT_ACTOR_EMOTE` | `actor_emote(target, emoteId);` |
| `EVENT_ACTOR_HIDE` | `actor_hide(target); actor_deactivate(target);` |
| `EVENT_ACTOR_MOVE_RELATIVE` | `actor_move_rel_step(target, dx, dy)` (handles collision & step-by-step movement) |
| `EVENT_ACTOR_MOVE_TO` | `actor_move_step(target, px, py)` |
| `EVENT_ACTOR_MOVE_TO_VALUE` | `actor_move_step(target, px, py)` |
| `EVENT_ACTOR_PUSH` | `actor_push(target, g_actor_dir[0], slide)` |
| `EVENT_ACTOR_SET_ANIMATE` | `actor_set_animate(target, animate);` |
| `EVENT_ACTOR_SET_ANIMATION_SPEED` | `actor_set_anim_speed(target, spd);` |
| `EVENT_ACTOR_SET_DIRECTION` | `actor_set_dir(target, dir);` (0=Right, 1=Left, 2=Up, 3=Down) |
| `EVENT_ACTOR_SET_DIRECTION_TO_VALUE` | `actor_set_dir(target, dir);` |
| `EVENT_ACTOR_SET_FRAME` | `actor_set_frame(target, frm);` |
| `EVENT_ACTOR_SET_FRAME_TO_VALUE` | `actor_set_frame(target, frm);` |
| `EVENT_ACTOR_SET_MOVEMENT_SPEED` | `actor_set_move_speed(target, spd);` |
| `EVENT_ACTOR_SET_POSITION` | `actor_set_pos(target, px, py);` |
| `EVENT_ACTOR_SET_POSITION_RELATIVE` | `actor_set_pos(target, g_actor_x[target] + dx, g_actor_y[target] + dy);` |
| `EVENT_ACTOR_SET_POSITION_TO_VALUE` | `actor_set_pos(target, px, py);` |
| `EVENT_ACTOR_SET_SPRITE` | `actor_set_sprite(target, vramAddr, numFrames, animSpeed, sprSize, palSlot);` |
| `EVENT_ACTOR_SET_STATE` | `player_set_state(target, state);` |
| `EVENT_ACTOR_SHOW` | `actor_show(target); actor_activate(target);` |
| `EVENT_ADD_FLAGS` | `vm_set_var(var, vm_get_var(var) \| mask);` |
| `EVENT_AWAIT_INPUT` | `g_await_input_mask = mask;` (pauses script execution until button press) |
| `EVENT_CAMERA_MOVE_TO` | `camera_update(cx, cy);` |
| `EVENT_CAMERA_SET_POSITION` | `camera_update(cx, cy);` |
| `EVENT_CAMERA_SHAKE` | `camera_shake(frames, mag);` |
| `EVENT_CHOICE` | `show_choice(var, trueText, falseText);` (presents 2-option dialogue prompt) |
| `EVENT_CLEAR_DATA` | `clear_game_data(slot);` |
| `EVENT_CLEAR_FLAGS` | `vm_set_var(var, vm_get_var(var) & ~mask);` |
| `EVENT_COPY_VALUE` | `vm_set_var(target, vm_get_var(source));` |
| `EVENT_DEC_VALUE` | `vm_set_var(var, vm_get_var(var) - 1);` |
| `EVENT_DIALOGUE_CLOSE_NONMODAL` | `hide_dialogue();` |
| `EVENT_FADE_IN` | `fade_in(speed);` (smooth 8-step hardware VCE palette fade-in, pauses script execution until complete) |
| `EVENT_FADE_OUT` | `fade_out(speed);` (smooth 8-step hardware VCE palette fade-out to black, pauses script execution until complete) |
| `EVENT_HIDE_SPRITES` | `actor_hide_all();` |
| `EVENT_IF` | Emits conditional jump: `if (cond) return trueStep; else return falseStep;` |
| `EVENT_IF_ACTOR_DISTANCE_FROM_ACTOR` | `actor_distance_check(act1, act2, dist, op)` conditional jump |
| `EVENT_IF_EXPRESSION` | Evaluates compound boolean expression conditional jump |
| `EVENT_IF_FALSE` | Jump if `vm_get_var(var) == 0` |
| `EVENT_IF_FLAGS_COMPARE` | Jump if `(vm_get_var(var) & mask) != 0` |
| `EVENT_IF_INPUT` | Checks `(pce_sys_read_joy(0) & mask) != 0` conditional jump |
| `EVENT_IF_SAVED_DATA` | Checks `has_saved_data(slot)` conditional jump |
| `EVENT_IF_TRUE` | Jump if `vm_get_var(var) != 0` |
| `EVENT_IF_VALUE` | Compares variable to literal/expression conditional jump |
| `EVENT_IF_VALUE_COMPARE` | Compares variable to right-hand value conditional jump |
| `EVENT_INC_VALUE` | `vm_set_var(var, vm_get_var(var) + 1);` |
| `EVENT_LAUNCH_PROJECTILE` | `projectile_launch(x, y, vx, vy, lifeFrames, ...);` |
| `EVENT_LAUNCH_PROJECTILE_SLOT` | `projectile_launch(...)` with slot parameters |
| `EVENT_LOAD_DATA` | `load_game(slot);` |
| `EVENT_LOOP` | Emits jump back to `loopStart` step |
| `EVENT_LOOP_FOR` | Emits bounded loop construct jump back to `loopStart` |
| `EVENT_LOOP_WHILE` | Emits while condition check and loop back jump |
| `EVENT_LOOP_WHILE_EXPRESSION` | Emits expression-based loop construct |
| `EVENT_MATH_ADD` | `vm_set_var(var, vm_get_var(var) + val);` |
| `EVENT_MATH_ADD_VALUE` | `vm_set_var(var, vm_get_var(var) + val);` |
| `EVENT_MATH_SUB` | `vm_set_var(var, vm_get_var(var) - val);` |
| `EVENT_MATH_SUB_VALUE` | `vm_set_var(var, vm_get_var(var) - val);` |
| `EVENT_MENU` | `show_menu(var, items, opt1, opt2, opt3, opt4, cancelB);` (2 to 4 items menu) |
| `EVENT_MUSIC_PLAY` | Super CD-ROM² CD-DA: `cd_playtrk(track, ...);` / Chiptune: `pce_sound_play(song_Data);` |
| `EVENT_MUSIC_STOP` | `pce_music_stop();` |
| `EVENT_RATE_LIMIT` | Checks `g_proj_rate_timer` cooldown, skips execution if cooldown active |
| `EVENT_REMOVE_INPUT_SCRIPT` | `g_input_script_disabled_mask |= mask;` |
| `EVENT_RESET_VARIABLES` | `vm_init();` (clears all 256 VM variables) |
| `EVENT_RNG_SEED` | `srand(g_wait_timer + pce_sys_read_joy(0));` |
| `EVENT_SAVE_DATA` | `save_game(slot);` |
| `EVENT_SET_FALSE` | `vm_set_var(var, 0);` |
| `EVENT_SET_FLAGS` | `vm_set_var(var, vm_get_var(var) \| mask);` |
| `EVENT_SET_INPUT_SCRIPT` | Extracted by `findInputScriptEvents` into scene-level `check_scene_X_input()` joypad dispatcher |
| `EVENT_SET_RANDOM_VALUE` | `vm_set_var(var, min + (rand() % range));` |
| `EVENT_SET_TRUE` | `vm_set_var(var, 1);` |
| `EVENT_SET_VALUE` | `vm_set_var(var, valExpr);` |
| `EVENT_SHOW_SPRITES` | `actor_show_all();` |
| `EVENT_SOUND_PLAY_CRASH` | `pce_sound_play_sfx(SFX_CRASH);` (PSG channel 5 noise generator) |
| `EVENT_SOUND_PLAY_EFFECT` | `pce_sound_play_sfx(SFX_CRASH);` (PSG channel 5 noise generator) |
| `EVENT_STOP` | `return -1;` (aborts current script sequence) |
| `EVENT_SWITCH` | Multi-branch jump table (`if (vm_get_var == valN) return targetN;`) |
| `EVENT_SWITCH_SCENE` | `load_scene(targetScene, targetX, targetY); return -1;` |
| `EVENT_TEXT` | `show_dialogue("text");` |
| `EVENT_TEXT_DRAW` | `show_dialogue("text");` (also extracted by `extractActorText`) |
| `EVENT_VARIABLE_MATH` | `vm_set_var(var, resExpr);` supporting `rand()` range (`minValue`..`maxValue`), variables, constants, `+`, `-`, `*`, `/`, `%`, `set`, and `clamp` |
| `EVENT_WAIT` | Sets `g_wait_timer = frames;` (scene) or `g_actor_wait_timer[actor] = frames;` (actor update) |

---

## 2. Explicit No-Op Events (78 Stubbed Events)

These 78 events are caught by explicit `else if (evt.command === ...)` clauses in [`buildProject.ts`](file:///c:/workspace/git/hucnext/pce-studio/src/lib/compiler/buildProject.ts). They emit `case step: return step + 1;` so that they never crash the compiler, safely advance the state machine, and properly traverse any child/nested event trees.

| Event Command | Category | Reason / Engine Note |
| :--- | :--- | :--- |
| `EVENT_ACTOR_EFFECTS` | Actor | Visual effects (flash, shake) not implemented in C runtime |
| `EVENT_ACTOR_GET_DIRECTION` | Actor | Accessible via expression properties |
| `EVENT_ACTOR_GET_POSITION` | Actor | Accessible via expression properties |
| `EVENT_ACTOR_INVOKE` | Actor | Cross-actor script invocation not implemented in PCE VM |
| `EVENT_ACTOR_MOVE_CANCEL` | Actor | Mid-movement cancellation stubbed |
| `EVENT_ACTOR_SET_COLLISION_BOX` | Actor | Dynamic collision box resizing stubbed |
| `EVENT_ACTOR_START_UPDATE` | Actor | Update thread control stubbed |
| `EVENT_ACTOR_STOP_UPDATE` | Actor | Update thread control stubbed |
| `EVENT_ADVENTURE_STATE_SET` | Mode | Adventure mode state field stubbed |
| `EVENT_CALL_CUSTOM_EVENT` | Flow | Inlined when children are present; standalone step is no-op |
| `EVENT_CAMERA_LOCK` | Camera | Camera lock mode stubbed |
| `EVENT_CAMERA_PROPERTY_SET` | Camera | Camera properties stubbed |
| `EVENT_CAMERA_SET_BOUNDS` | Camera | Camera boundary clamping stubbed |
| `EVENT_CAMERA_SET_LOCK` | Camera | Camera lock axis stubbed |
| `EVENT_CODE` | Script | Inline GBVM bytecode stubbed |
| `EVENT_COMMENT` | Meta | Editor developer notes |
| `EVENT_DATA_TABLE` | Data | Data table lookup stubbed |
| `EVENT_ENGINE_FIELD_SET` | Engine | Engine fields stubbed |
| `EVENT_ENGINE_FIELD_STORE` | Engine | Engine fields stubbed |
| `EVENT_FADE_SETTINGS` | Screen | Fade speed settings stubbed |
| `EVENT_IDLE` | Flow | Idle yield stubbed |
| `EVENT_IF_ACTOR_AT_POSITION` | Actor | Actor coordinate check stubbed |
| `EVENT_IF_ACTOR_DIRECTION` | Actor | Actor direction check stubbed |
| `EVENT_IF_ACTOR_RELATIVE_TO_ACTOR` | Actor | Relative position check stubbed |
| `EVENT_IF_COLOR_SUPPORTED` | Screen | Game Boy Color hardware check (PCE is always 16-bit color) |
| `EVENT_IF_CURRENT_SCENE_IS` | Scene | Current scene check stubbed |
| `EVENT_IF_ENGINE_FIELD` | Engine | Engine field condition check stubbed |
| `EVENT_IF_ENGINE_FIELD_COMPARE` | Engine | Engine field compare check stubbed |
| `EVENT_LOAD_PROJECTILE_SLOT` | Projectile | Projectile slot config stubbed |
| `EVENT_MATH_DIV` | Math | Legacy math div stubbed (handled in `EVENT_VARIABLE_MATH`) |
| `EVENT_MATH_DIV_VALUE` | Math | Legacy math div stubbed (handled in `EVENT_VARIABLE_MATH`) |
| `EVENT_MATH_MOD` | Math | Legacy math mod stubbed (handled in `EVENT_VARIABLE_MATH`) |
| `EVENT_MATH_MOD_VALUE` | Math | Legacy math mod stubbed (handled in `EVENT_VARIABLE_MATH`) |
| `EVENT_MATH_MUL` | Math | Legacy math mul stubbed (handled in `EVENT_VARIABLE_MATH`) |
| `EVENT_MATH_MUL_VALUE` | Math | Legacy math mul stubbed (handled in `EVENT_VARIABLE_MATH`) |
| `EVENT_MUTE_CHANNEL` | Audio | Audio channel muting stubbed |
| `EVENT_NOTES` | Meta | Editor notes / comments |
| `EVENT_OVERLAY_HIDE` | Overlay | Text window overlay hiding stubbed |
| `EVENT_OVERLAY_MOVE_TO` | Overlay | Overlay animation stubbed |
| `EVENT_OVERLAY_SET_SCANLINE_CUTOFF` | Overlay | Hardware scanline interrupt stubbed |
| `EVENT_OVERLAY_SHOW` | Overlay | Overlay show stubbed |
| `EVENT_PEEK_DATA` | Data | Raw memory peeking stubbed |
| `EVENT_PLATFORMER_DETACH_PLATFORM` | Mode | Platformer mode physics stubbed |
| `EVENT_PLATFORMER_SET_STATE` | Mode | Platformer state stubbed |
| `EVENT_PLATFORMER_STATE_SET` | Mode | Platformer state stubbed |
| `EVENT_PLAYER_BOUNCE` | Actor | Platformer jump bounce stubbed |
| `EVENT_PLAYER_SET_SPRITE` | Actor | Dynamic player sprite sheet swapping stubbed |
| `EVENT_REMOVE_ADVENTURE_CALLBACK_SCRIPT` | Mode | Adventure callback removal stubbed |
| `EVENT_REMOVE_PLATFORMER_CALLBACK_SCRIPT` | Mode | Platformer callback removal stubbed |
| `EVENT_REPLACE_TILE_XY` | Scene | Dynamic background tile swapping stubbed |
| `EVENT_REPLACE_TILE_XY_SEQUENCE` | Scene | Dynamic background tile animation stubbed |
| `EVENT_SCENE_POP_ALL_STATE` | Scene | Scene stack stubbed |
| `EVENT_SCENE_POP_STATE` | Scene | Scene stack stubbed |
| `EVENT_SCENE_PUSH_STATE` | Scene | Scene stack stubbed |
| `EVENT_SCENE_RESET_STATE` | Scene | Scene stack stubbed |
| `EVENT_SCENE_UPDATE_PAUSE` | Scene | Scene actor loop pause stubbed |
| `EVENT_SCENE_UPDATE_RESUME` | Scene | Scene actor loop resume stubbed |
| `EVENT_SCRIPT_LOCK` | Script | Script input lock stubbed (PCE VM locks input while running) |
| `EVENT_SCRIPT_UNLOCK` | Script | Script input unlock stubbed |
| `EVENT_SET_ADVENTURE_CALLBACK_SCRIPT` | Mode | Adventure callback hook stubbed |
| `EVENT_SET_DIALOGUE_FRAME` | Dialogue | Dialogue frame border styling stubbed |
| `EVENT_SET_FONT` | Dialogue | Dynamic font switching stubbed |
| `EVENT_SET_MUSIC_ROUTINE` | Audio | Audio driver beat callback stubbed |
| `EVENT_SET_PLATFORMER_CALLBACK_SCRIPT` | Mode | Platformer callback hook stubbed |
| `EVENT_SET_TIMER_SCRIPT` | Timer | Background recurring timer stubbed |
| `EVENT_SOUND_PLAY_BEEP` | Audio | PSG square wave beep stubbed |
| `EVENT_SOUND_PLAY_TONE` | Audio | PSG tone generator stubbed |
| `EVENT_TEXT_REMOVE_SOUND_EFFECT` | Dialogue | Dialogue typewriter SFX stubbed |
| `EVENT_TEXT_SET_ANIMATION_SPEED` | Dialogue | Typewriter text speed stubbed |
| `EVENT_TEXT_SET_SOUND_EFFECT` | Dialogue | Dialogue typewriter SFX stubbed |
| `EVENT_THREAD_START` | Thread | Parallel VM thread stubbed |
| `EVENT_THREAD_STOP` | Thread | Parallel VM thread stubbed |
| `EVENT_TIMER_DISABLE` | Timer | Periodic timer stubbed |
| `EVENT_TIMER_RESTART` | Timer | Periodic timer stubbed |
| `EVENT_VARIABLE_MATH_EVALUATE` | Math | Complex math AST expression stubbed |
| `EVENT_WEAPON_ATTACK` | Combat | Weapon hitbox attack stubbed |

---

## 3. UI Taxonomy Group Tags (34 Tags)

These items are UI taxonomy categories used in the GB Studio / PCE Studio event library modal, not script events:

- `EVENT_GROUP`
- `EVENT_GROUP_ACTIONS`
- `EVENT_GROUP_ACTOR`
- `EVENT_GROUP_BOOLEAN`
- `EVENT_GROUP_CAMERA`
- `EVENT_GROUP_COLOR`
- `EVENT_GROUP_CONTROL_FLOW`
- `EVENT_GROUP_COUNTER`
- `EVENT_GROUP_DATA_TABLE`
- `EVENT_GROUP_DEVICE`
- `EVENT_GROUP_DIALOGUE`
- `EVENT_GROUP_ENGINE_FIELDS`
- `EVENT_GROUP_FLAGS`
- `EVENT_GROUP_INPUT`
- `EVENT_GROUP_MATH`
- `EVENT_GROUP_MISC`
- `EVENT_GROUP_MOVEMENT`
- `EVENT_GROUP_MULTIPLAYER`
- `EVENT_GROUP_MUSIC`
- `EVENT_GROUP_OVERLAY`
- `EVENT_GROUP_PROPERTIES`
- `EVENT_GROUP_RANDOM`
- `EVENT_GROUP_RESET`
- `EVENT_GROUP_SAVE_DATA`
- `EVENT_GROUP_SCENE`
- `EVENT_GROUP_SCENE_STACK`
- `EVENT_GROUP_SCREEN`
- `EVENT_GROUP_SCRIPT`
- `EVENT_GROUP_THREADS`
- `EVENT_GROUP_TILES`
- `EVENT_GROUP_TIMER`
- `EVENT_GROUP_VARIABLES`
- `EVENT_GROUP_VISIBILITY`
- `# EVENT_GROUP_PRINTER`

---

## 4. Complete Alphabetical Reference Table

| # | Event Name | Category | Status in PCE Studio |
| :---: | :--- | :--- | :--- |
| 1 | `EVENT_ACTOR_ACTIVATE` | Actor | **Implemented** (`actor_activate`) |
| 2 | `EVENT_ACTOR_COLLISIONS_DISABLE` | Actor | **Implemented** (`actor_set_collisions`) |
| 3 | `EVENT_ACTOR_COLLISIONS_ENABLE` | Actor | **Implemented** (`actor_set_collisions`) |
| 4 | `EVENT_ACTOR_DEACTIVATE` | Actor | **Implemented** (`actor_deactivate`) |
| 5 | `EVENT_ACTOR_EFFECTS` | Actor | **Explicit No-Op** (`return step + 1`) |
| 6 | `EVENT_ACTOR_EMOTE` | Actor | **Implemented** (`actor_emote`) |
| 7 | `EVENT_ACTOR_GET_DIRECTION` | Actor | **Explicit No-Op** (`return step + 1`) |
| 8 | `EVENT_ACTOR_GET_POSITION` | Actor | **Explicit No-Op** (`return step + 1`) |
| 9 | `EVENT_ACTOR_HIDE` | Actor | **Implemented** (`actor_hide`) |
| 10 | `EVENT_ACTOR_INVOKE` | Actor | **Explicit No-Op** (`return step + 1`) |
| 11 | `EVENT_ACTOR_MOVE_CANCEL` | Actor | **Explicit No-Op** (`return step + 1`) |
| 12 | `EVENT_ACTOR_MOVE_RELATIVE` | Actor | **Implemented** (`actor_move_rel_step`) |
| 13 | `EVENT_ACTOR_MOVE_TO` | Actor | **Implemented** (`actor_move_step`) |
| 14 | `EVENT_ACTOR_MOVE_TO_VALUE` | Actor | **Implemented** (`actor_move_step`) |
| 15 | `EVENT_ACTOR_PUSH` | Actor | **Implemented** (`actor_push`) |
| 16 | `EVENT_ACTOR_SET_ANIMATE` | Actor | **Explicit No-Op** (`return step + 1`) |
| 17 | `EVENT_ACTOR_SET_ANIMATION_SPEED` | Actor | **Implemented** (`actor_set_anim_speed`) |
| 18 | `EVENT_ACTOR_SET_COLLISION_BOX` | Actor | **Explicit No-Op** (`return step + 1`) |
| 19 | `EVENT_ACTOR_SET_DIRECTION` | Actor | **Implemented** (`actor_set_dir`) |
| 20 | `EVENT_ACTOR_SET_DIRECTION_TO_VALUE` | Actor | **Implemented** (`actor_set_dir`) |
| 21 | `EVENT_ACTOR_SET_FRAME` | Actor | **Implemented** (`actor_set_frame`) |
| 22 | `EVENT_ACTOR_SET_FRAME_TO_VALUE` | Actor | **Implemented** (`actor_set_frame`) |
| 23 | `EVENT_ACTOR_SET_MOVEMENT_SPEED` | Actor | **Implemented** (`actor_set_move_speed`) |
| 24 | `EVENT_ACTOR_SET_POSITION` | Actor | **Implemented** (`actor_set_pos`) |
| 25 | `EVENT_ACTOR_SET_POSITION_RELATIVE` | Actor | **Implemented** (`actor_set_pos`) |
| 26 | `EVENT_ACTOR_SET_POSITION_TO_VALUE` | Actor | **Implemented** (`actor_set_pos`) |
| 27 | `EVENT_ACTOR_SET_SPRITE` | Actor | **Explicit No-Op** (`return step + 1`) |
| 28 | `EVENT_ACTOR_SET_STATE` | Actor | **Implemented** (`player_set_state`) |
| 29 | `EVENT_ACTOR_SHOW` | Actor | **Implemented** (`actor_show`) |
| 30 | `EVENT_ACTOR_START_UPDATE` | Actor | **Explicit No-Op** (`return step + 1`) |
| 31 | `EVENT_ACTOR_STOP_UPDATE` | Actor | **Explicit No-Op** (`return step + 1`) |
| 32 | `EVENT_ADD_FLAGS` | Flags | **Implemented** (`vm_set_var \|`) |
| 33 | `EVENT_ADVENTURE_STATE_SET` | Mode | **Explicit No-Op** (`return step + 1`) |
| 34 | `EVENT_AWAIT_INPUT` | Input | **Implemented** (`g_await_input_mask`) |
| 35 | `EVENT_CALL_CUSTOM_EVENT` | Flow | **Explicit No-Op** (`return step + 1`) |
| 36 | `EVENT_CAMERA_LOCK` | Camera | **Explicit No-Op** (`return step + 1`) |
| 37 | `EVENT_CAMERA_MOVE_TO` | Camera | **Implemented** (`camera_update`) |
| 38 | `EVENT_CAMERA_PROPERTY_SET` | Camera | **Explicit No-Op** (`return step + 1`) |
| 39 | `EVENT_CAMERA_SET_BOUNDS` | Camera | **Explicit No-Op** (`return step + 1`) |
| 40 | `EVENT_CAMERA_SET_LOCK` | Camera | **Explicit No-Op** (`return step + 1`) |
| 41 | `EVENT_CAMERA_SET_POSITION` | Camera | **Implemented** (`camera_update`) |
| 42 | `EVENT_CAMERA_SHAKE` | Camera | **Implemented** (`camera_shake`) |
| 43 | `EVENT_CHOICE` | Dialogue | **Implemented** (`show_choice`) |
| 44 | `EVENT_CLEAR_DATA` | Save | **Implemented** (`clear_game_data`) |
| 45 | `EVENT_CLEAR_FLAGS` | Flags | **Implemented** (`vm_set_var & ~`) |
| 46 | `EVENT_CODE` | Script | **Explicit No-Op** (`return step + 1`) |
| 47 | `EVENT_COMMENT` | Meta | **Explicit No-Op** (`return step + 1`) |
| 48 | `EVENT_COPY_VALUE` | Variable | **Implemented** (`vm_set_var`) |
| 49 | `EVENT_DATA_TABLE` | Data | **Explicit No-Op** (`return step + 1`) |
| 50 | `EVENT_DEC_VALUE` | Variable | **Implemented** (`vm_set_var - 1`) |
| 51 | `EVENT_DIALOGUE_CLOSE_NONMODAL` | Dialogue | **Implemented** (`hide_dialogue`) |
| 52 | `EVENT_ENGINE_FIELD_SET` | Engine | **Explicit No-Op** (`return step + 1`) |
| 53 | `EVENT_ENGINE_FIELD_STORE` | Engine | **Explicit No-Op** (`return step + 1`) |
| 54 | `EVENT_FADE_IN` | Screen | **Implemented** (`fade_in`) |
| 55 | `EVENT_FADE_OUT` | Screen | **Implemented** (`fade_out`) |
| 56 | `EVENT_FADE_SETTINGS` | Screen | **Explicit No-Op** (`return step + 1`) |
| 57 | `EVENT_GROUP` | UI | **UI Group Tag** |
| 58 | `EVENT_GROUP_ACTIONS` | UI | **UI Group Tag** |
| 59 | `EVENT_GROUP_ACTOR` | UI | **UI Group Tag** |
| 60 | `EVENT_GROUP_BOOLEAN` | UI | **UI Group Tag** |
| 61 | `EVENT_GROUP_CAMERA` | UI | **UI Group Tag** |
| 62 | `EVENT_GROUP_COLOR` | UI | **UI Group Tag** |
| 63 | `EVENT_GROUP_CONTROL_FLOW` | UI | **UI Group Tag** |
| 64 | `EVENT_GROUP_COUNTER` | UI | **UI Group Tag** |
| 65 | `EVENT_GROUP_DATA_TABLE` | UI | **UI Group Tag** |
| 66 | `EVENT_GROUP_DEVICE` | UI | **UI Group Tag** |
| 67 | `EVENT_GROUP_DIALOGUE` | UI | **UI Group Tag** |
| 68 | `EVENT_GROUP_ENGINE_FIELDS` | UI | **UI Group Tag** |
| 69 | `EVENT_GROUP_FLAGS` | UI | **UI Group Tag** |
| 70 | `EVENT_GROUP_INPUT` | UI | **UI Group Tag** |
| 71 | `EVENT_GROUP_MATH` | UI | **UI Group Tag** |
| 72 | `EVENT_GROUP_MISC` | UI | **UI Group Tag** |
| 73 | `EVENT_GROUP_MOVEMENT` | UI | **UI Group Tag** |
| 74 | `EVENT_GROUP_MULTIPLAYER` | UI | **UI Group Tag** |
| 75 | `EVENT_GROUP_MUSIC` | UI | **UI Group Tag** |
| 76 | `EVENT_GROUP_OVERLAY` | UI | **UI Group Tag** |
| 77 | `EVENT_GROUP_PRINTER` | UI | **UI Group Tag** |
| 78 | `EVENT_GROUP_PROPERTIES` | UI | **UI Group Tag** |
| 79 | `EVENT_GROUP_RANDOM` | UI | **UI Group Tag** |
| 80 | `EVENT_GROUP_RESET` | UI | **UI Group Tag** |
| 81 | `EVENT_GROUP_SAVE_DATA` | UI | **UI Group Tag** |
| 82 | `EVENT_GROUP_SCENE` | UI | **UI Group Tag** |
| 83 | `EVENT_GROUP_SCENE_STACK` | UI | **UI Group Tag** |
| 84 | `EVENT_GROUP_SCREEN` | UI | **UI Group Tag** |
| 85 | `EVENT_GROUP_SCRIPT` | UI | **UI Group Tag** |
| 86 | `EVENT_GROUP_THREADS` | UI | **UI Group Tag** |
| 87 | `EVENT_GROUP_TILES` | UI | **UI Group Tag** |
| 88 | `EVENT_GROUP_TIMER` | UI | **UI Group Tag** |
| 89 | `EVENT_GROUP_VARIABLES` | UI | **UI Group Tag** |
| 90 | `EVENT_GROUP_VISIBILITY` | UI | **UI Group Tag** |
| 91 | `EVENT_HIDE_SPRITES` | Actor | **Implemented** (`actor_hide_all`) |
| 92 | `EVENT_IDLE` | Flow | **Explicit No-Op** (`return step + 1`) |
| 93 | `EVENT_IF` | Flow | **Implemented** (Conditional Branch) |
| 94 | `EVENT_IF_ACTOR_AT_POSITION` | Actor | **Explicit No-Op** (`return step + 1`) |
| 95 | `EVENT_IF_ACTOR_DIRECTION` | Actor | **Explicit No-Op** (`return step + 1`) |
| 96 | `EVENT_IF_ACTOR_DISTANCE_FROM_ACTOR` | Actor | **Implemented** (`actor_distance_check`) |
| 97 | `EVENT_IF_ACTOR_RELATIVE_TO_ACTOR` | Actor | **Explicit No-Op** (`return step + 1`) |
| 98 | `EVENT_IF_COLOR_SUPPORTED` | Screen | **Explicit No-Op** (`return step + 1`) |
| 99 | `EVENT_IF_CURRENT_SCENE_IS` | Scene | **Explicit No-Op** (`return step + 1`) |
| 100 | `EVENT_IF_ENGINE_FIELD` | Engine | **Explicit No-Op** (`return step + 1`) |
| 101 | `EVENT_IF_ENGINE_FIELD_COMPARE` | Engine | **Explicit No-Op** (`return step + 1`) |
| 102 | `EVENT_IF_EXPRESSION` | Flow | **Implemented** (Expression Branch) |
| 103 | `EVENT_IF_FALSE` | Variable | **Implemented** (`vm_get_var == 0`) |
| 104 | `EVENT_IF_FLAGS_COMPARE` | Flags | **Implemented** (`vm_get_var & mask != 0`) |
| 105 | `EVENT_IF_INPUT` | Input | **Implemented** (Joypad check) |
| 106 | `EVENT_IF_SAVED_DATA` | Save | **Implemented** (`has_saved_data`) |
| 107 | `EVENT_IF_TRUE` | Variable | **Implemented** (`vm_get_var != 0`) |
| 108 | `EVENT_IF_VALUE` | Variable | **Implemented** (Value compare branch) |
| 109 | `EVENT_IF_VALUE_COMPARE` | Variable | **Implemented** (Value compare branch) |
| 110 | `EVENT_INC_VALUE` | Variable | **Implemented** (`vm_set_var + 1`) |
| 111 | `EVENT_LAUNCH_PROJECTILE` | Projectile | **Implemented** (`projectile_launch`) |
| 112 | `EVENT_LAUNCH_PROJECTILE_SLOT` | Projectile | **Implemented** (`projectile_launch`) |
| 113 | `EVENT_LOAD_DATA` | Save | **Implemented** (`load_game`) |
| 114 | `EVENT_LOAD_PROJECTILE_SLOT` | Projectile | **Explicit No-Op** (`return step + 1`) |
| 115 | `EVENT_LOOP` | Flow | **Implemented** (Loop cycle) |
| 116 | `EVENT_LOOP_FOR` | Flow | **Implemented** (Loop cycle) |
| 117 | `EVENT_LOOP_WHILE` | Flow | **Implemented** (Loop cycle) |
| 118 | `EVENT_LOOP_WHILE_EXPRESSION` | Flow | **Implemented** (Loop cycle) |
| 119 | `EVENT_MATH_ADD` | Math | **Implemented** (`vm_set_var +`) |
| 120 | `EVENT_MATH_ADD_VALUE` | Math | **Implemented** (`vm_set_var +`) |
| 121 | `EVENT_MATH_DIV` | Math | **Explicit No-Op** (`return step + 1`) |
| 122 | `EVENT_MATH_DIV_VALUE` | Math | **Explicit No-Op** (`return step + 1`) |
| 123 | `EVENT_MATH_MOD` | Math | **Explicit No-Op** (`return step + 1`) |
| 124 | `EVENT_MATH_MOD_VALUE` | Math | **Explicit No-Op** (`return step + 1`) |
| 125 | `EVENT_MATH_MUL` | Math | **Explicit No-Op** (`return step + 1`) |
| 126 | `EVENT_MATH_MUL_VALUE` | Math | **Explicit No-Op** (`return step + 1`) |
| 127 | `EVENT_MATH_SUB` | Math | **Implemented** (`vm_set_var -`) |
| 128 | `EVENT_MATH_SUB_VALUE` | Math | **Implemented** (`vm_set_var -`) |
| 129 | `EVENT_MENU` | Dialogue | **Implemented** (`show_menu`) |
| 130 | `EVENT_MUSIC_PLAY` | Audio | **Implemented** (`pce_sound_play` / `cd_playtrk`) |
| 131 | `EVENT_MUSIC_STOP` | Audio | **Implemented** (`pce_music_stop`) |
| 132 | `EVENT_MUTE_CHANNEL` | Audio | **Explicit No-Op** (`return step + 1`) |
| 133 | `EVENT_NOTES` | Meta | **Explicit No-Op** (`return step + 1`) |
| 134 | `EVENT_OVERLAY_HIDE` | Overlay | **Explicit No-Op** (`return step + 1`) |
| 135 | `EVENT_OVERLAY_MOVE_TO` | Overlay | **Explicit No-Op** (`return step + 1`) |
| 136 | `EVENT_OVERLAY_SET_SCANLINE_CUTOFF` | Overlay | **Explicit No-Op** (`return step + 1`) |
| 137 | `EVENT_OVERLAY_SHOW` | Overlay | **Explicit No-Op** (`return step + 1`) |
| 138 | `EVENT_PEEK_DATA` | Data | **Explicit No-Op** (`return step + 1`) |
| 139 | `EVENT_PLATFORMER_DETACH_PLATFORM` | Mode | **Explicit No-Op** (`return step + 1`) |
| 140 | `EVENT_PLATFORMER_SET_STATE` | Mode | **Explicit No-Op** (`return step + 1`) |
| 141 | `EVENT_PLATFORMER_STATE_SET` | Mode | **Explicit No-Op** (`return step + 1`) |
| 142 | `EVENT_PLAYER_BOUNCE` | Actor | **Explicit No-Op** (`return step + 1`) |
| 143 | `EVENT_PLAYER_SET_SPRITE` | Actor | **Explicit No-Op** (`return step + 1`) |
| 144 | `EVENT_RATE_LIMIT` | Projectile | **Implemented** (`g_proj_rate_timer`) |
| 145 | `EVENT_REMOVE_ADVENTURE_CALLBACK_SCRIPT` | Mode | **Explicit No-Op** (`return step + 1`) |
| 146 | `EVENT_REMOVE_INPUT_SCRIPT` | Input | **Implemented** (`g_input_script_disabled_mask`) |
| 147 | `EVENT_REMOVE_PLATFORMER_CALLBACK_SCRIPT` | Mode | **Explicit No-Op** (`return step + 1`) |
| 148 | `EVENT_REPLACE_TILE_XY` | Scene | **Explicit No-Op** (`return step + 1`) |
| 149 | `EVENT_REPLACE_TILE_XY_SEQUENCE` | Scene | **Explicit No-Op** (`return step + 1`) |
| 150 | `EVENT_RESET_VARIABLES` | Variable | **Implemented** (`vm_init`) |
| 151 | `EVENT_RNG_SEED` | Math | **Implemented** (`srand`) |
| 152 | `EVENT_SAVE_DATA` | Save | **Implemented** (`save_game`) |
| 153 | `EVENT_SCENE_POP_ALL_STATE` | Scene | **Explicit No-Op** (`return step + 1`) |
| 154 | `EVENT_SCENE_POP_STATE` | Scene | **Explicit No-Op** (`return step + 1`) |
| 155 | `EVENT_SCENE_PUSH_STATE` | Scene | **Explicit No-Op** (`return step + 1`) |
| 156 | `EVENT_SCENE_RESET_STATE` | Scene | **Explicit No-Op** (`return step + 1`) |
| 157 | `EVENT_SCENE_UPDATE_PAUSE` | Scene | **Explicit No-Op** (`return step + 1`) |
| 158 | `EVENT_SCENE_UPDATE_RESUME` | Scene | **Explicit No-Op** (`return step + 1`) |
| 159 | `EVENT_SCRIPT_LOCK` | Script | **Explicit No-Op** (`return step + 1`) |
| 160 | `EVENT_SCRIPT_UNLOCK` | Script | **Explicit No-Op** (`return step + 1`) |
| 161 | `EVENT_SET_ADVENTURE_CALLBACK_SCRIPT` | Mode | **Explicit No-Op** (`return step + 1`) |
| 162 | `EVENT_SET_DIALOGUE_FRAME` | Dialogue | **Explicit No-Op** (`return step + 1`) |
| 163 | `EVENT_SET_FALSE` | Variable | **Implemented** (`vm_set_var = 0`) |
| 164 | `EVENT_SET_FLAGS` | Flags | **Implemented** (`vm_set_var \|`) |
| 165 | `EVENT_SET_FONT` | Dialogue | **Explicit No-Op** (`return step + 1`) |
| 166 | `EVENT_SET_INPUT_SCRIPT` | Input | **Implemented** (`check_scene_X_input`) |
| 167 | `EVENT_SET_MUSIC_ROUTINE` | Audio | **Explicit No-Op** (`return step + 1`) |
| 168 | `EVENT_SET_PLATFORMER_CALLBACK_SCRIPT` | Mode | **Explicit No-Op** (`return step + 1`) |
| 169 | `EVENT_SET_RANDOM_VALUE` | Variable | **Implemented** (`vm_set_var = rand()`) |
| 170 | `EVENT_SET_TIMER_SCRIPT` | Timer | **Explicit No-Op** (`return step + 1`) |
| 171 | `EVENT_SET_TRUE` | Variable | **Implemented** (`vm_set_var = 1`) |
| 172 | `EVENT_SET_VALUE` | Variable | **Implemented** (`vm_set_var`) |
| 173 | `EVENT_SHOW_SPRITES` | Actor | **Implemented** (`actor_show_all`) |
| 174 | `EVENT_SOUND_PLAY_BEEP` | Audio | **Explicit No-Op** (`return step + 1`) |
| 175 | `EVENT_SOUND_PLAY_CRASH` | Audio | **Explicit No-Op** (`return step + 1`) |
| 176 | `EVENT_SOUND_PLAY_EFFECT` | Audio | **Explicit No-Op** (`return step + 1`) |
| 177 | `EVENT_SOUND_PLAY_TONE` | Audio | **Explicit No-Op** (`return step + 1`) |
| 178 | `EVENT_STOP` | Flow | **Implemented** (`return -1`) |
| 179 | `EVENT_SWITCH` | Flow | **Implemented** (Multi-way switch branch) |
| 180 | `EVENT_SWITCH_SCENE` | Scene | **Implemented** (`load_scene`) |
| 181 | `EVENT_TEXT` | Dialogue | **Implemented** (`show_dialogue`) |
| 182 | `EVENT_TEXT_DRAW` | Dialogue | **Implemented** (`show_dialogue`) |
| 183 | `EVENT_TEXT_REMOVE_SOUND_EFFECT` | Dialogue | **Explicit No-Op** (`return step + 1`) |
| 184 | `EVENT_TEXT_SET_ANIMATION_SPEED` | Dialogue | **Explicit No-Op** (`return step + 1`) |
| 185 | `EVENT_TEXT_SET_SOUND_EFFECT` | Dialogue | **Explicit No-Op** (`return step + 1`) |
| 186 | `EVENT_THREAD_START` | Thread | **Explicit No-Op** (`return step + 1`) |
| 187 | `EVENT_THREAD_STOP` | Thread | **Explicit No-Op** (`return step + 1`) |
| 188 | `EVENT_TIMER_DISABLE` | Timer | **Explicit No-Op** (`return step + 1`) |
| 189 | `EVENT_TIMER_RESTART` | Timer | **Explicit No-Op** (`return step + 1`) |
| 190 | `EVENT_VARIABLE_MATH` | Math | **Implemented** (`vm_set_var` with random & operators) |
| 191 | `EVENT_VARIABLE_MATH_EVALUATE` | Math | **Explicit No-Op** (`return step + 1`) |
| 192 | `EVENT_WAIT` | Flow | **Implemented** (`g_wait_timer` / `g_actor_wait_timer`) |
| 193 | `EVENT_WEAPON_ATTACK` | Combat | **Explicit No-Op** (`return step + 1`) |
