export const ERROR_TIMED_OUT = "TIMED_OUT";
export const ERROR_AUDIO_ENCODE_FAILED = "AUDIO_ENCODE_FAILED";

export const MIN_EXPORT_LOOPS = 1;
export const MAX_EXPORT_LOOPS = 10;

export const channels = [
  {
    id: "0",
    index: 0,
    name: "PCE CH1 (Duty 1)",
    shortName: "CH1",
    type: "duty",
  },
  {
    id: "1",
    index: 1,
    name: "PCE CH2 (Duty 2)",
    shortName: "CH2",
    type: "duty",
  },
  {
    id: "2",
    index: 2,
    name: "PCE CH3 (Wave 1)",
    shortName: "CH3",
    type: "wave",
  },
  {
    id: "3",
    index: 3,
    name: "PCE CH4 (Wave 2)",
    shortName: "CH4",
    type: "wave",
  },
  {
    id: "4",
    index: 4,
    name: "PCE CH5 (Noise 1)",
    shortName: "CH5",
    type: "noise",
  },
  {
    id: "5",
    index: 5,
    name: "PCE CH6 (Noise 2)",
    shortName: "CH6",
    type: "noise",
  },
] as {
  id: string;
  index: 0 | 1 | 2 | 3 | 4 | 5;
  name: string;
  shortName: string;
  type: "duty" | "wave" | "noise";
}[];

// prettier-ignore
export const noteGBDKDefines = [
  "C_3", "Cs3", "D_3", "Ds3", "E_3", "F_3", "Fs3", "G_3", "Gs3", "A_3", "As3", "B_3", "C_4", "Cs4", "D_4", "Ds4", "E_4", "F_4", "Fs4", "G_4", "Gs4", "A_4", "As4", "B_4", "C_5", "Cs5", "D_5", "Ds5", "E_5", "F_5", "Fs5", "G_5", "Gs5", "A_5", "As5", "B_5", "C_6", "Cs6", "D_6", "Ds6", "E_6", "F_6", "Fs6", "G_6", "Gs6", "A_6", "As6", "B_6", "C_7", "Cs7", "D_7", "Ds7", "E_7", "F_7", "Fs7", "G_7", "Gs7", "A_7", "As7", "B_7", "C_8", "Cs8", "D_8", "Ds8", "E_8", "F_8", "Fs8", "G_8", "Gs8", "A_8", "As8", "B_8"
];

// prettier-ignore
export const noteStringsForClipboard = [
  "C-3", "C#3", "D-3", "D#3", "E-3", "F-3", "F#3", "G-3", "G#3", "A-3", "A#3", "B-3", "C-4", "C#4", "D-4", "D#4", "E-4", "F-4", "F#4", "G-4", "G#4", "A-4", "A#4", "B-4", "C-5", "C#5", "D-5", "D#5", "E-5", "F-5", "F#5", "G-5", "G#5", "A-5", "A#5", "B-5", "C-6", "C#6", "D-6", "D#6", "E-6", "F-6", "F#6", "G-6", "G#6", "A-6", "A#6", "B-6", "C-7", "C#7", "D-7", "D#7", "E-7", "F-7", "F#7", "G-7", "G#7", "A-7", "A#7", "B-7", "C-8", "C#8", "D-8", "D#8", "E-8", "F-8", "F#8", "G-8", "G#8", "A-8", "A#8", "B-8",
];

export const note2freq = [
  /*C_3*/ 44, /*Cs3*/ 156, /*D_3*/ 262, /*Ds3*/ 363, /*E_3*/ 457, /*F_3*/ 547,
  /*Fs3*/ 631, /*G_3*/ 710, /*Gs3*/ 786, /*A_3*/ 854, /*As3*/ 923, /*B_3*/ 986,
  /*C_4*/ 1046, /*Cs4*/ 1102, /*D_4*/ 1155, /*Ds4*/ 1205, /*E_4*/ 1253,
  /*F_4*/ 1297, /*Fs4*/ 1339, /*G_4*/ 1379, /*Gs4*/ 1417, /*A_4*/ 1452,
  /*As4*/ 1486, /*B_4*/ 1517, /*C_5*/ 1546, /*Cs5*/ 1575, /*D_5*/ 1602,
  /*Ds5*/ 1627, /*E_5*/ 1650, /*F_5*/ 1673, /*Fs5*/ 1694, /*G_5*/ 1714,
  /*Gs5*/ 1732, /*A_5*/ 1750, /*As5*/ 1767, /*B_5*/ 1783, /*C_6*/ 1798,
  /*Cs6*/ 1812, /*D_6*/ 1825, /*Ds6*/ 1837, /*E_6*/ 1849, /*F_6*/ 1860,
  /*Fs6*/ 1871, /*G_6*/ 1881, /*Gs6*/ 1890, /*A_6*/ 1899, /*As6*/ 1907,
  /*B_6*/ 1915, /*C_7*/ 1923, /*Cs7*/ 1930, /*D_7*/ 1936, /*Ds7*/ 1943,
  /*E_7*/ 1949, /*F_7*/ 1954, /*Fs7*/ 1959, /*G_7*/ 1964, /*Gs7*/ 1969,
  /*A_7*/ 1974, /*As7*/ 1978, /*B_7*/ 1982, /*C_8*/ 1985, /*Cs8*/ 1988,
  /*D_8*/ 1992, /*Ds8*/ 1995, /*E_8*/ 1998, /*F_8*/ 2001, /*Fs8*/ 2004,
  /*G_8*/ 2006, /*Gs8*/ 2009, /*A_8*/ 2011, /*As8*/ 2013, /*B_8*/ 2015,
];

// PC Engine 12-bit frequency divisor table for 72 notes (C_3 to B_8) (3.58MHz / 32 / freq)
export const pceNote2Freq = [
  /*C_3*/ 855, /*Cs3*/ 807, /*D_3*/ 762, /*Ds3*/ 719, /*E_3*/ 679, /*F_3*/ 641,
  /*Fs3*/ 605, /*G_3*/ 571, /*Gs3*/ 539, /*A_3*/ 508, /*As3*/ 480, /*B_3*/ 453,
  /*C_4*/ 428, /*Cs4*/ 404, /*D_4*/ 381, /*Ds4*/ 360, /*E_4*/ 339, /*F_4*/ 320,
  /*Fs4*/ 302, /*G_4*/ 285, /*Gs4*/ 269, /*A_4*/ 254, /*As4*/ 240, /*B_4*/ 227,
  /*C_5*/ 214, /*Cs5*/ 202, /*D_5*/ 190, /*Ds5*/ 180, /*E_5*/ 170, /*F_5*/ 160,
  /*Fs5*/ 151, /*G_5*/ 143, /*Gs5*/ 135, /*A_5*/ 127, /*As5*/ 120, /*B_5*/ 113,
  /*C_6*/ 107, /*Cs6*/ 101, /*D_6*/ 95,  /*Ds6*/ 90,  /*E_6*/ 85,  /*F_6*/ 80,
  /*Fs6*/ 76,  /*G_6*/ 71,  /*Gs6*/ 67,  /*A_6*/ 64,  /*As6*/ 60,  /*B_6*/ 57,
  /*C_7*/ 53,  /*Cs7*/ 50,  /*D_7*/ 48,  /*Ds7*/ 45,  /*E_7*/ 42,  /*F_7*/ 40,
  /*Fs7*/ 38,  /*G_7*/ 36,  /*Gs7*/ 34,  /*A_7*/ 32,  /*As7*/ 30,  /*B_7*/ 28,
  /*C_8*/ 27,  /*Cs8*/ 25,  /*D_8*/ 24,  /*Ds8*/ 22,  /*E_8*/ 21,  /*F_8*/ 20,
  /*Fs8*/ 19,  /*G_8*/ 18,  /*Gs8*/ 17,  /*A_8*/ 16,  /*As8*/ 15,  /*B_8*/ 14,
];

// PC Engine HuC6280 PSG Sound Controller registers (Page $FF: 0x0800 - 0x0807)
export const PSG_CH = 0x0800;
export const PSG_MAINVOL = 0x0801;
export const PSG_FREQLO = 0x0802;
export const PSG_FREQHI = 0x0803;
export const PSG_CTRL = 0x0804;
export const PSG_PAN = 0x0805;
export const PSG_WAVEBUF = 0x0806;
export const PSG_NOISE = 0x0807;

// Game Boy sound controller registers (for GB compatibility fallback)
export const NR10 = 0xff10;
export const NR11 = 0xff11;
export const NR12 = 0xff12;
export const NR13 = 0xff13;
export const NR14 = 0xff14;
export const NR21 = 0xff16;
export const NR22 = 0xff17;
export const NR23 = 0xff18;
export const NR24 = 0xff19;
export const NR30 = 0xff1a;
export const NR31 = 0xff1b;
export const NR32 = 0xff1c;
export const NR33 = 0xff1d;
export const NR34 = 0xff1e;
export const NR41 = 0xff20;
export const NR42 = 0xff21;
export const NR43 = 0xff22;
export const NR44 = 0xff23;
export const AUD3_WAVE_RAM = 0xff30;

