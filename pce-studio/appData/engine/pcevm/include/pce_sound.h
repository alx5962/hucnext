#ifndef PCE_SOUND_H
#define PCE_SOUND_H

#define SFX_CRASH 1

void pce_sound_init(void);
void pce_sound_play(unsigned int* song);
void pce_sound_stop(void);
void pce_sound_update(void);
void pce_music_play_track(int track_num, unsigned int *song);
void pce_music_stop(void);
void pce_sound_play_sfx(int sfx_id);

#endif /* PCE_SOUND_H */
