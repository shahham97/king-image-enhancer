# Kingshyer Atelier Parfums — High-Fidelity Photo Enhancer & Batch WebP Engine

A world-class, 100% offline, client-side photo enhancer and batch image resizer built specifically for the **Kingshyer** luxury perfume brand.

Runs entirely in browser memory using HTML5 Canvas, bicubic downsampling algorithms, and the WebP encoder. **Zero photos are ever uploaded anywhere; zero API keys, zero backend dependencies.**

---

## Brand Presets & Storefront Dimensions

Designed around Kingshyer's exact storefront ratios and display guidelines:

| Preset | Aspect Ratio | 1x Standard | 2x Retina HD | Recommended Fit Mode | Ideal Storefront Use Case |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Hero Pedestal Showcase** | 4:5 | 800 × 1000 px | 1200 × 1500 px | Ambient Blur Backdrop | Primary collection hero & pedestal feature |
| **Storefront Product Cards** | 3:4 | 600 × 800 px | 900 × 1200 px | Smart Luxury Fill (Cover) | Catalog grid & hover-swap galleries |
| **PDP Main Flacon Zoom** | 1:1 (Square) | 1000 × 1000 px | 1600 × 1600 px | Smart Luxury Fill (Cover) | High-definition flacon zoom & buy box |
| **Editorial / Journal Banner** | 16:9 | 1920 × 1080 px | 2560 × 1440 px | Ambient Blur Backdrop | Wide fragrance stories & editorial banners |
| **Custom Dimensions** | User Defined | Custom px | Custom px | Selectable | Flexible arbitrary marketing targets |

### Three Bottle Fit Modes
1. **Pedestal Center with Ambient Blur Backdrop**: Keeps 100% of the flacon in view without shrinking, while generating a soft, gaussian-blurred ambient background of the same photo behind it with a deep obsidian overlay to eliminate black side bars.
2. **Smart Luxury Fill (Cover)**: Centers bottle and cleanly crops to fill without stretching or letterboxing.
3. **Padded Luxury Canvas**: Centers flacon on a solid Kingshyer dark luxury background (`#06050a`) with subtle radial pedestal spotlight.

---

## Professional In-Memory Photo Studio

Non-destructive real-time adjustment sliders running at 60fps:
- **Clarity / High-Pass Detail**: Unsharp masking algorithm via 2D convolution matrix to accentuate glass flacon edges, metallic mist nozzles, and gold-leaf branding.
- **Exposure / Brightness**: Fine ±50% luminance adjustment with highlight protection.
- **Obsidian Contrast (S-Curve)**: Smooth Hermite S-curve tone mapping to produce deep obsidian blacks without crushing highlights.
- **Luxury Warmth / Gold Vibrance**: Gentle color temperature control to make warm amber, oud, and gold accents shimmer.
- **Fragrance Saturation**: Natural color vibrance control (protecting highlights from clipping).
- **Pedestal Vignette Focus**: Subtle radial darkening around corners to direct maximum visual focus to the central perfume flacon.
- **High-DPI Downsample Sharpening**: Variable radius unsharp mask optimized for WebP downsampling.

### One-Click Studio Profiles
- **Kingshyer Signature Gold**: Warm amber luminescence and subtle pedestal vignette.
- **Royal Amber & Oud**: Deep contrast with rich golden warmth for dark fragrances.
- **Crystal Pure Atelier**: Cool clarity, crisp glass facets, and bright highlights.
- **Noir Velvet Nocturne**: Dramatic contrast and deep obsidian shadows.
- **Storefront Ultra Crisp**: Sharp punchy studio light for catalog listings.
- **Neutral Studio**: Zero-adjustment unedited raw balance.

---

## High-Fidelity Batch WebP Compression
- **Format**: Pure WebP (`image/webp`).
- **Quality Control**: Recommended default **88%** (sweet spot providing 70–85% smaller file size than PNG/JPEG with zero perceptual loss).
- **Live Telemetry**: Real-time before vs. after file size (KB/MB) and percentage saved.
- **Multi-File Batch Queue**: Drag and drop 1 to 50+ images at once.
- **Download Options**:
  - Individual single image WebP download.
  - **"Download All as ZIP"**: Uses bundled client-side JSZip to export `kingshyer-[preset]-[filename].webp`.

---

## Interactive Capabilities
- **Split Wipe Comparison**: Draggable gold divider with live before/after reveal.
- **Side by Side View**: Direct dual-frame comparison between original raw and enhanced studio output.
- **Interactive Crop & Pan**: Click and drag on the canvas to center or offset the flacon, plus mouse wheel zoom (40% to 350%).
- **Alignment Guidelines**: Toggleable rule-of-thirds grid and pedestal center crosshair.
- **Preloaded Kingshyer Demos**: One-click demo button preloads high-res sample flacons (*Royal Obsidian*, *Royal Emerald Oud*, and *Noir Rose*).

---

## How to Run
This application is completely offline and client-side.

### Option 1: Direct File Launch
Double-click `index.html` to open directly in any modern browser (Chrome, Edge, Safari, Firefox).

### Option 2: Local HTTP Server
Run with Python:
```bash
python -m http.server 8088
```
Or with npm:
```bash
npm start
```
Then navigate to: `http://localhost:8088`
