#ifndef HUGEDRIVER_H
#define HUGEDRIVER_H

#define DN(note, inst, effect) (note), ((inst) << 4) | (((effect) >> 8) & 0x0F), ((effect) & 0xFF)

#define ___ 0xFF
#define C_3 0
#define Cs3 1
#define D_3 2
#define Ds3 3
#define E_3 4
#define F_3 5
#define Fs3 6
#define G_3 7
#define Gs3 8
#define A_3 9
#define As3 10
#define B_3 11

#define C_4 12
#define Cs4 13
#define D_4 14
#define Ds4 15
#define E_4 16
#define F_4 17
#define Fs4 18
#define G_4 19
#define Gs4 20
#define A_4 21
#define As4 22
#define B_4 23

#define C_5 24
#define Cs5 25
#define D_5 26
#define Ds5 27
#define E_5 28
#define F_5 29
#define Fs5 30
#define G_5 31
#define Gs5 32
#define A_5 33
#define As5 34
#define B_5 35

#define C_6 36
#define Cs6 37
#define D_6 38
#define Ds6 39
#define E_6 40
#define F_6 41
#define Fs6 42
#define G_6 43
#define Gs6 44
#define A_6 45
#define As6 46
#define B_6 47

#define C_7 48
#define Cs7 49
#define D_7 50
#define Ds7 51
#define E_7 52
#define F_7 53
#define Fs7 54
#define G_7 55
#define Gs7 56
#define A_7 57
#define As7 58
#define B_7 59

#define C_8 60
#define Cs8 61
#define D_8 62
#define Ds8 63
#define E_8 64
#define F_8 65
#define Fs8 66
#define G_8 67
#define Gs8 68
#define A_8 69
#define As8 70
#define B_8 71

#endif /* HUGEDRIVER_H */
