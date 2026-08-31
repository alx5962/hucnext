# PC Engine Audio Engine & Music Specification Guide

This document specifies the complete technical capabilities, supported features, channel architecture, instrument settings, effect commands, and file format requirements of the **pce-studio** audio engine and music player.

This guide is designed for music producers writing `.uge` music files. All files adhering to these specifications can be imported directly into the engine without modification.

---

## 1. Overview & Tooling

- **File Format:** `.uge` (hUGETracker Song format, versions up to v6 supported).
- **Recommended Authoring Tool:** **[hUGETracker](https://github.com/SuperDisk/hUGETracker)** (or the integrated PCE-Studio Tracker).
- **Target Hardware Architecture:** PC Engine / TurboGrafx-16 (HuC6280 Custom Sound Generator / PSG).
- **Playback Engine:** Native 60 Hz interrupt-driven sound driver (`pce_sound.c`) running custom 5-bit wavetable synthesis and hardware noise generation with full stereo panning.

---

## 2. Channel Architecture & Hardware Allocation

### 2.1 The 4 Music Tracks vs 6 Hardware Channels

The PC Engine HuC6280 PSG chip physically features **6 independent sound channels** (PSG 0 to 5). 

To ensure games have dedicated channels for in-game sound effects (SFX) without cutting off or corrupting background music, the music engine dedicates **4 active music tracks** from the `.uge` song file and reserves the remaining 2 hardware channels for SFX:

| `.uge` Track | Track Name | Physical PSG Channel | Sound Generation Type | Typical Musical Role |
| :--- | :--- | :--- | :--- | :--- |
| **Track 1** | `CH1 (Duty 1)` | **PSG Channel 0** | Pulse Wave Synthesis (4 selectable duty cycles) | Lead Melody, Arpeggios, Chords |
| **Track 2** | `CH2 (Duty 2)` | **PSG Channel 1** | Pulse Wave Synthesis (4 selectable duty cycles) | Counter-Melody, Harmony, Chords |
| **Track 3** | `CH3 (Wave)` | **PSG Channel 2** | 32-sample Custom Wavetable (16 user waveforms) | Basslines, Synth Leads, Bells, Organ |
| **Track 4** | `CH4 (Noise)` | **PSG Channel 4** | 5-bit Hardware LFSR White/Periodic Noise | Drums, Snares, Hats, Percussion |
| *SFX Slot 1* | *N/A* | **PSG Channel 3** | 32-sample Wavetable / DDA | *Reserved for Game Sound Effects* |
| *SFX Slot 2* | *N/A* | **PSG Channel 5** | Hardware LFSR Noise / Wavetable | *Reserved for Game Sound Effects* |

> [!NOTE]
> **Composer Rule:** Always compose songs using the standard **4-channel layout** in hUGETracker (`CH1 Duty`, `CH2 Duty`, `CH3 Wave`, `CH4 Noise`). The exported `.uge` file will directly map to the PC Engine hardware during compilation.

---

## 3. Note Range & Frequency Pitch

- **Supported Note Range:** 6 full octaves — **`C_3` to `B_8`** (72 distinct semitones, internal indices `0` to `71`).
- **Pitch Frequency Precision:** 12-bit hardware frequency divisors derived from the PC Engine 3.58 MHz master clock.
- **Track 3 (Wave) Pitch Offset:** The wave channel is automatically shifted down by 1 octave (`note - 12`) in the frequency lookup table to naturally provide deep bass and lower register fundamental frequencies.
- **Track 4 (Noise) Pitch Mapping:** The pitch of the noise channel is determined by the note value modulo 32 (`note % 32`), mapping directly to the 32 discrete frequency divisor steps of the PC Engine hardware noise generator.

---

## 4. Instrument Specifications

The engine supports up to **15 Duty Instruments**, **15 Wave Instruments**, and **15 Noise Instruments**.

### 4.1 Duty Instruments (Tracks 1 & 2)

Duty instruments produce classic chiptune pulse and square waves with hardware envelope shaping.

- **Duty Cycle (Waveform):**
  - `0`: **12.5% Pulse** (Bright, thin, harpsichord-like)
  - `1`: **25.0% Pulse** (Warm, acoustic piano / brass timbre)
  - `2`: **50.0% Square** (Pure hollow clarinet / flute / lead sound)
  - `3`: **75.0% Pulse** (Full rich timbre, inverted 25%)
- **Initial Volume:** `0` to `15` (linearly scaled to 5-bit PC Engine amplitude `0` to `31`).
- **Volume Envelope (ADSR Decay/Attack):**
  - **Direction:** `Decay` (volume decreases) or `Attack` (volume increases).
  - **Step Rate:** `0` (envelope disabled / static sustain) or `1`–`7` (frames per volume step).
- **Note Length Counter:** Optional automatic note cut after `1` to `64` length ticks (`64 - length`).

### 4.2 Wave Instruments (Track 3)

Wave instruments play arbitrary 32-sample, 5-bit digital waveforms loaded into the PSG channel's dedicated Wave RAM.

- **Waveform Selection:** `0` to `15` (selects one of the 16 global 32-sample waveforms defined in the song).
- **Volume Levels:** 4 discrete hardware levels:
  - `0`: 0% (Muted)
  - `1`: 100% (Maximum amplitude, 31)
  - `2`: 50% (Medium amplitude, 16)
  - `3`: 25% (Low amplitude, 8)
- **Note Length Counter:** Optional automatic note cut after `1` to `256` length ticks (`256 - length`).
- **Waveform Definition in UGE:** Each waveform contains 32 4-bit nibbles (`0` to `15`), which the engine automatically expands and centers to 5-bit PC Engine samples (`(nibble * 2) + 1`).

### 4.3 Noise Instruments (Track 4)

Noise instruments trigger the hardware pseudo-random noise generator on PC Engine channel 4.

- **Initial Volume:** `0` to `15` (scaled to 5-bit noise volume `0` to `31`).
- **Volume Envelope:**
  - **Direction:** `Decay` or `Attack`.
  - **Step Rate:** `0` (static) or `1`–`7` (frames per volume step).
- **Note Length Counter:** Optional automatic note cut after `1` to `64` length ticks (`64 - length`).

---

## 5. Supported Tracker Effect Commands

All effects below are verified, implemented, and fully functional in the native audio driver:

| Effect Code | Name | Parameter Format (`xx` / `xy`) | Description & Behavior |
| :--- | :--- | :--- | :--- |
| **`0xy`** | **Arpeggio** | `x` = 1st semitone offset<br>`y` = 2nd semitone offset | Cycles pitch every tick: Tick 0 = Root note, Tick 1 = Root + `x`, Tick 2 = Root + `y`. |
| **`1xx`** | **Portamento Up** | `xx` = Frequency delta rate | Increases pitch (decreases 12-bit period divisor) by `xx` on each tick. |
| **`2xx`** | **Portamento Down** | `xx` = Frequency delta rate | Decreases pitch (increases 12-bit period divisor) by `xx` on each tick (clamped to 4095). |
| **`3xx`** | **Tone Portamento** | `xx` = Slide speed | Smoothly glides the current pitch towards the specified row note at speed `xx` per tick without retriggering the volume envelope. |
| **`4xy`** | **Vibrato** | `x` = Modulation speed<br>`y` = Modulation depth | Applies a 16-step sine-wave pitch modulation. |
| **`7xx`** | **Note Delay** | `xx` = Target tick (`0` to `ticksPerRow - 1`) | Delays note and instrument trigger until tick `xx` within the current row. |
| **`8xx`** | **Set Panning** | `xx` = Standard GB NR51 panning mask | Configures stereo output:<br>- Left Channel: Bit `4 + Track` (`0x10`, `0x20`, `0x40`, `0x80`)<br>- Right Channel: Bit `Track` (`0x01`, `0x02`, `0x04`, `0x08`)<br>- Examples: `8FF` = Center, `8F0` = Hard Left, `80F` = Hard Right. |
| **`9xx`** | **Set Duty Cycle** | `xx` = Duty selector | Dynamically changes the waveform on Tracks 1 & 2:<br>- `900`: 12.5% Duty<br>- `940`: 25.0% Duty<br>- `980`: 50.0% Duty<br>- `9C0`: 75.0% Duty |
| **`Axy`** | **Volume Slide** | `x0` = Slide Up speed<br>`0y` = Slide Down speed | Smoothly slides volume up by `x` or down by `y` on each tick (`Ax0` slides up, `A0y` slides down). |
| **`Bxx`** | **Position Jump** | `xx` = Target order index | Immediately jumps song playback to sequence order index `xx` at row 0. |
| **`Cxx`** | **Set Volume** | `xx` = Volume level (`00` to `0F`) | Directly sets the channel's current volume level (`0` to `15`). |
| **`Dxx`** | **Pattern Break** | `xx` = Parameter (unused) | Breaks the current pattern and advances immediately to row 0 of the next sequence order. |
| **`Exy`** | **Note Cut** | `y` = Cut tick (`0` to `F`) | Instantly cuts channel volume to 0 when playback reaches tick `y`. |
| **`Fxx`** | **Set Speed / Tempo** | `xx` = Ticks per row (`01` to `1F`) | Sets the number of 60 Hz clock ticks per pattern row (e.g. `F06` = 6 ticks/row). |

---

## 6. Song Structure & Timing Specifications

- **Pattern Length:** Exactly **64 rows** per pattern.
- **Sequence / Order List:** Up to 128 orders defining the playback sequence across the 4 tracks.
- **Tick Clock Rate:** Fixed at **60 Hz** (synchronized with the VDC screen refresh VBlank).
- **Tempo & BPM Formula:**
  $$\text{BPM} = \frac{960}{\text{Ticks Per Row}} \quad (\text{assuming 4 rows per beat})$$
  - `F06` (6 ticks/row) $\rightarrow$ **160 BPM** (or standard 10 rows/second)
  - `F05` (5 ticks/row) $\rightarrow$ **192 BPM** (12 rows/second)
  - `F04` (4 ticks/row) $\rightarrow$ **240 BPM** (15 rows/second)
  - `F08` (8 ticks/row) $\rightarrow$ **120 BPM** (7.5 rows/second)

---

## 7. Producer Best Practices & Recommendations

1. **Direct Integration:** Export `.uge` files directly from hUGETracker. Do not apply external post-processing tools.
2. **Looping:** Place a `Bxx` (Position Jump) command on the last row of your loop section to seamlessly loop playback to order `xx`.
3. **Bass on Track 3:** Use Track 3 (Wave) for basslines and complex timbres. Take advantage of custom 32-sample wave designs in the tracker's wave editor.
4. **Percussion on Track 4:** For punchy snare drums and hi-hats, combine noise pitch settings (`C-4` to `C-6`) with rapid volume decay envelopes (`Step 1` or `Step 2`) or tick note cuts (`E02` / `E03`).
5. **Stereo Mixing:** Use `8xx` panning commands to create a wide stereo field (e.g. panning Duty 1 slightly left and Duty 2 slightly right while keeping Bass and Drums centered).
