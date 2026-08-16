# PC Engine / TG16 Composite Palette (.ACT & .ACO Files)

This document provides the generated **Adobe Color Table (`.act`)** and **Adobe Color Swatches (`.aco`)** files for Photoshop, built directly from [Kitrinx's TG16 Composite Palette generator model](https://github.com/Kitrinx/TG16_Palette).

---

## 🎨 Palette Preview

Below is the full 512-color PC Engine hardware composite palette grid (32 columns × 16 rows):

![PC Engine Composite Palette Preview](tg16_palette_preview.png)

---

## 📁 Downloadable Palette Files

Because the PC Engine's 9-bit RGB space contains **512 total colors** while standard Photoshop `.act` (Indexed Color) tables strictly support **256 colors**, multiple formats have been generated to cover all workflow needs:

### 1. Photoshop Swatches File (Recommended for Photoshop UI)
- [**`tg16_palette.aco`**](tg16_palette.aco) (29.7 KB)
  - **Best for Photoshop picking**: Load into Photoshop's **Swatches** panel (`Window > Swatches > Import Swatches`).
  - Contains all **512 PC Engine colors** complete with hardware index labels (e.g. `PCE 005 (G0R0B5)`).

### 2. Adobe Color Table Files (`.act`)
- [**`tg16_palette_512.act`**](tg16_palette_512.act) (1.5 KB)
  - Raw 512-color table (1,536 bytes; 512 × 3 RGB bytes). Use with pixel art editors or custom tools that support extended 512-entry ACT files.
- [**`tg16_palette_part1.act`**](tg16_palette_part1.act) (772 bytes)
  - Standard 256-color ACT file covering the lower half of the PC Engine palette (hardware indices 0–255, Green levels 0–3).
- [**`tg16_palette_part2.act`**](tg16_palette_part2.act) (772 bytes)
  - Standard 256-color ACT file covering the upper half of the PC Engine palette (hardware indices 256–511, Green levels 4–7).

---

## 🛠 How to Use in Adobe Photoshop

### Loading `.act` Files into Indexed Color Mode:
1. Open your image in Photoshop.
2. Go to **Image > Mode > Indexed Color...**
3. In the Palette dropdown, choose **Custom...**
4. Click **Load...** and select [`tg16_palette_part1.act`](tg16_palette_part1.act), [`tg16_palette_part2.act`](tg16_palette_part2.act), or [`tg16_palette_512.act`](tg16_palette_512.act).

### Loading `.aco` Files into Swatches Panel:
1. Open the **Swatches** panel (`Window > Swatches`).
2. Click the menu icon (top right of Swatches panel) and select **Import Swatches...** (or **Load Swatches...**).
3. Select [`tg16_palette.aco`](tg16_palette.aco). All 512 PC Engine composite colors will appear in your palette swatches.
