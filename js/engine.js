/**
 * Kingshyer Luxury Image Enhancement & Downsampling Engine
 * 100% Client-Side, In-Memory Canvas Processing
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KingshyerEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Preset Configurations matching Kingshyer Brand Identity
  const PRESETS = {
    hero: {
      id: 'hero',
      name: 'Hero Pedestal Showcase',
      description: 'Primary flacon showcase for hero banners & collection pages',
      ratio: '4:5',
      aspectRatioValue: 4 / 5,
      width1x: 800,
      height1x: 1000,
      width2x: 1200,
      height2x: 1500,
      badge: 'Hero 4:5',
      defaultFit: 'ambient'
    },
    catalog: {
      id: 'catalog',
      name: 'Storefront Product Cards',
      description: 'Catalog & category grid, gallery thumbnails & hover swap',
      ratio: '3:4',
      aspectRatioValue: 3 / 4,
      width1x: 600,
      height1x: 800,
      width2x: 900,
      height2x: 1200,
      badge: 'Catalog 3:4',
      defaultFit: 'cover'
    },
    pdp: {
      id: 'pdp',
      name: 'PDP Flacon Zoom & Buy Box',
      description: 'Product detail page high-definition flacon zoom & buy box',
      ratio: '1:1',
      aspectRatioValue: 1,
      width1x: 1000,
      height1x: 1000,
      width2x: 1600,
      height2x: 1600,
      badge: 'PDP 1:1',
      defaultFit: 'cover'
    },
    editorial: {
      id: 'editorial',
      name: 'Editorial / Journal / Banner',
      description: 'Wide cinematic showcase for fragrance stories and journal banners',
      ratio: '16:9',
      aspectRatioValue: 16 / 9,
      width1x: 1920,
      height1x: 1080,
      width2x: 2560,
      height2x: 1440,
      badge: 'Editorial 16:9',
      defaultFit: 'ambient'
    },
    custom: {
      id: 'custom',
      name: 'Custom Dimensions',
      description: 'User-specified target dimensions with customizable aspect lock',
      ratio: 'custom',
      aspectRatioValue: null,
      width1x: 1000,
      height1x: 1000,
      width2x: 2000,
      height2x: 2000,
      badge: 'Custom',
      defaultFit: 'cover'
    }
  };

  // Studio Profiles / Visual Filter Styles
  const STUDIO_PROFILES = {
    neutral: {
      name: 'Neutral Studio',
      exposure: 0,
      contrast: 0,
      clarity: 0,
      warmth: 0,
      saturation: 0,
      vignette: 0,
      sharpen: 0
    },
    signature_gold: {
      name: 'Kingshyer Signature Gold',
      exposure: 3,
      contrast: 12,
      clarity: 22,
      warmth: 16,
      saturation: 8,
      vignette: 14,
      sharpen: 12
    },
    royal_amber: {
      name: 'Royal Amber & Oud',
      exposure: -2,
      contrast: 18,
      clarity: 25,
      warmth: 28,
      saturation: 15,
      vignette: 24,
      sharpen: 15
    },
    crystal_pure: {
      name: 'Crystal Pure Atelier',
      exposure: 5,
      contrast: 8,
      clarity: 32,
      warmth: -6,
      saturation: 2,
      vignette: 10,
      sharpen: 22
    },
    noir_luxury: {
      name: 'Noir Velvet Nocturne',
      exposure: -10,
      contrast: 24,
      clarity: 20,
      warmth: 8,
      saturation: -4,
      vignette: 36,
      sharpen: 14
    },
    commercial_crisp: {
      name: 'Storefront Ultra Crisp',
      exposure: 2,
      contrast: 10,
      clarity: 18,
      warmth: 4,
      saturation: 5,
      vignette: 0,
      sharpen: 25
    }
  };

  const DEFAULT_ADJUSTMENTS = {
    exposure: 0,      // -50 to +50 (%)
    contrast: 0,      // -50 to +50 (%)
    clarity: 0,       // 0 to 100
    warmth: 0,        // -50 to +50 (Gold / Amber vs Cool Silver)
    saturation: 0,    // -100 to +100 (%)
    vignette: 0,      // 0 to 100 (%)
    sharpen: 0,       // 0 to 100 (%)
    // Viewport transforms
    zoom: 1.0,        // 0.5 to 3.0
    panX: 0,          // offset percentage -50% to +50%
    panY: 0,          // offset percentage -50% to +50%
    // Fit Mode: 'cover', 'ambient', 'padded'
    fitMode: 'cover',
    canvasBgColor: '#06050a'
  };

  /**
   * High-Quality Multi-Step Downsampling (Bicubic simulation)
   * Avoids aliasing and pixel jitter when scaling down 24MP+ raw files.
   */
  function stepDownscale(sourceCanvas, targetWidth, targetHeight) {
    let currentWidth = sourceCanvas.width;
    let currentHeight = sourceCanvas.height;

    // If source is smaller or equal, return a direct draw
    if (currentWidth <= targetWidth && currentHeight <= targetHeight) {
      const out = document.createElement('canvas');
      out.width = targetWidth;
      out.height = targetHeight;
      const ctx = out.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
      return out;
    }

    let tempCanvas = document.createElement('canvas');
    let tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = currentWidth;
    tempCanvas.height = currentHeight;
    tempCtx.drawImage(sourceCanvas, 0, 0);

    // Iteratively scale down in halves until we reach approximately 2x of target
    while (currentWidth * 0.5 > targetWidth && currentHeight * 0.5 > targetHeight) {
      const nextWidth = Math.floor(currentWidth * 0.5);
      const nextHeight = Math.floor(currentHeight * 0.5);

      const nextCanvas = document.createElement('canvas');
      nextCanvas.width = nextWidth;
      nextCanvas.height = nextHeight;
      const nextCtx = nextCanvas.getContext('2d');

      nextCtx.imageSmoothingEnabled = true;
      nextCtx.imageSmoothingQuality = 'high';
      nextCtx.drawImage(tempCanvas, 0, 0, currentWidth, currentHeight, 0, 0, nextWidth, nextHeight);

      tempCanvas = nextCanvas;
      currentWidth = nextWidth;
      currentHeight = nextHeight;
    }

    // Final scaling pass to exact target dimensions
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(tempCanvas, 0, 0, currentWidth, currentHeight, 0, 0, targetWidth, targetHeight);

    return finalCanvas;
  }

  /**
   * Fast 1D Box Blur pass for separable 2D convolution (used in clarity unsharp mask)
   */
  function boxBlurH(scl, tcl, w, h, r) {
    const iarr = 1 / (r + r + 1);
    for (let i = 0; i < h; i++) {
      let ti = i * w;
      let li = ti;
      let ri = ti + r;
      let fv = scl[ti];
      let lv = scl[ti + w - 1];
      let val = (r + 1) * fv;
      for (let j = 0; j < r; j++) val += scl[ti + j];
      for (let j = 0; j <= r; j++) {
        val += scl[ri++] - fv;
        tcl[ti++] = Math.round(val * iarr);
      }
      for (let j = r + 1; j < w - r; j++) {
        val += scl[ri++] - scl[li++];
        tcl[ti++] = Math.round(val * iarr);
      }
      for (let j = w - r; j < w; j++) {
        val += lv - scl[li++];
        tcl[ti++] = Math.round(val * iarr);
      }
    }
  }

  function boxBlurT(scl, tcl, w, h, r) {
    const iarr = 1 / (r + r + 1);
    for (let i = 0; i < w; i++) {
      let ti = i;
      let li = ti;
      let ri = ti + r * w;
      let fv = scl[ti];
      let lv = scl[ti + w * (h - 1)];
      let val = (r + 1) * fv;
      for (let j = 0; j < r; j++) val += scl[ti + j * w];
      for (let j = 0; j <= r; j++) {
        val += scl[ri] - fv;
        tcl[ti] = Math.round(val * iarr);
        ri += w;
        ti += w;
      }
      for (let j = r + 1; j < h - r; j++) {
        val += scl[ri] - scl[li];
        tcl[ti] = Math.round(val * iarr);
        li += w;
        ri += w;
        ti += w;
      }
      for (let j = h - r; j < h; j++) {
        val += lv - scl[li];
        tcl[ti] = Math.round(val * iarr);
        li += w;
        ti += w;
      }
    }
  }

  function fastBoxBlurChannel(channel, w, h, r) {
    const target = new Uint8ClampedArray(channel.length);
    boxBlurH(channel, target, w, h, r);
    boxBlurT(target, channel, w, h, r);
  }

  /**
   * Applies non-destructive studio adjustments on ImageData in-place.
   * Optimizes inner loops for 60fps real-time responsiveness.
   */
  function applyStudioAdjustments(imageData, adjustments) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;

    const exposure = (adjustments.exposure || 0) / 100; // -0.5 to 0.5
    const contrast = (adjustments.contrast || 0) / 100; // -0.5 to 0.5
    const warmth = (adjustments.warmth || 0);           // -50 to 50
    const saturation = (adjustments.saturation || 0) / 100; // -1 to 1
    const vignette = (adjustments.vignette || 0) / 100;     // 0 to 1
    const clarity = (adjustments.clarity || 0) / 100;       // 0 to 1
    const sharpen = (adjustments.sharpen || 0) / 100;       // 0 to 1

    // Precalculate lookup table for contrast & exposure to minimize per-pixel math
    const lutR = new Uint8ClampedArray(256);
    const lutG = new Uint8ClampedArray(256);
    const lutB = new Uint8ClampedArray(256);

    // Warmth shifts
    const rShift = warmth * 0.7;
    const gShift = warmth * 0.25;
    const bShift = -warmth * 0.75;

    for (let i = 0; i < 256; i++) {
      // 1. Exposure
      let r = i * (1 + exposure);
      let g = i * (1 + exposure);
      let b = i * (1 + exposure);

      // 2. Warmth
      r += rShift;
      g += gShift;
      b += bShift;

      // 3. Contrast: Smooth Hermite S-Curve
      // f(x) = x + c * x * (1 - x) * (x - 0.5) * 4
      if (contrast !== 0) {
        const applyContrast = (val) => {
          let norm = Math.max(0, Math.min(255, val)) / 255;
          let factor = norm + contrast * norm * (1 - norm) * (norm - 0.5) * 4;
          return factor * 255;
        };
        r = applyContrast(r);
        g = applyContrast(g);
        b = applyContrast(b);
      }

      lutR[i] = Math.max(0, Math.min(255, Math.round(r)));
      lutG[i] = Math.max(0, Math.min(255, Math.round(g)));
      lutB[i] = Math.max(0, Math.min(255, Math.round(b)));
    }

    // Step A: Apply LUT + Saturation per pixel
    const satFactor = 1 + saturation;
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      let r = lutR[data[idx]];
      let g = lutG[data[idx + 1]];
      let b = lutB[data[idx + 2]];

      // Saturation / Vibrance
      if (saturation !== 0) {
        // Luminance (Rec. 709)
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = lum + (r - lum) * satFactor;
        g = lum + (g - lum) * satFactor;
        b = lum + (b - lum) * satFactor;
      }

      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
    }

    // Step B: Clarity / High-Pass Detail (Unsharp Mask on Luminance/Color)
    // Enhances micro-contrast of perfume glass facets and embossed gold labels
    if (clarity > 0.01) {
      const radius = Math.max(2, Math.min(8, Math.round(Math.min(width, height) / 180)));
      const origR = new Uint8ClampedArray(totalPixels);
      const origG = new Uint8ClampedArray(totalPixels);
      const origB = new Uint8ClampedArray(totalPixels);

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        origR[i] = data[idx];
        origG[i] = data[idx + 1];
        origB[i] = data[idx + 2];
      }

      const blurredR = new Uint8ClampedArray(origR);
      const blurredG = new Uint8ClampedArray(origG);
      const blurredB = new Uint8ClampedArray(origB);

      fastBoxBlurChannel(blurredR, width, height, radius);
      fastBoxBlurChannel(blurredG, width, height, radius);
      fastBoxBlurChannel(blurredB, width, height, radius);

      const clarityScale = clarity * 1.5;
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        // High-pass difference
        const diffR = origR[i] - blurredR[i];
        const diffG = origG[i] - blurredG[i];
        const diffB = origB[i] - blurredB[i];

        data[idx] = Math.max(0, Math.min(255, origR[i] + diffR * clarityScale));
        data[idx + 1] = Math.max(0, Math.min(255, origG[i] + diffG * clarityScale));
        data[idx + 2] = Math.max(0, Math.min(255, origB[i] + diffB * clarityScale));
      }
    }

    // Step C: Sharpening (3x3 Convolution Kernel)
    if (sharpen > 0.01) {
      const s = sharpen * 0.45;
      const copy = new Uint8ClampedArray(data);

      for (let y = 1; y < height - 1; y++) {
        const rowOffset = y * width;
        for (let x = 1; x < width - 1; x++) {
          const idx = (rowOffset + x) * 4;

          for (let c = 0; c < 3; c++) {
            const center = copy[idx + c];
            const top = copy[((y - 1) * width + x) * 4 + c];
            const bottom = copy[((y + 1) * width + x) * 4 + c];
            const left = copy[(rowOffset + (x - 1)) * 4 + c];
            const right = copy[(rowOffset + (x + 1)) * 4 + c];

            const sharpVal = center * (1 + 4 * s) - (top + bottom + left + right) * s;
            data[idx + c] = Math.max(0, Math.min(255, sharpVal));
          }
        }
      }
    }

    // Step D: Vignette (Luxury Radial Darkening)
    if (vignette > 0.01) {
      const cx = width / 2;
      const cy = height / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      const vigAmount = vignette * 0.85;

      for (let y = 0; y < height; y++) {
        const dy = y - cy;
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const dx = x - cx;
          const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;

          // Smoothstep rolloff starting from 0.35 distance
          if (dist > 0.35) {
            const t = Math.min(1, (dist - 0.35) / 0.65);
            const smoothT = t * t * (3 - 2 * t);
            const factor = 1 - vigAmount * smoothT;

            const idx = (rowOffset + x) * 4;
            data[idx] = Math.round(data[idx] * factor);
            data[idx + 1] = Math.round(data[idx + 1] * factor);
            data[idx + 2] = Math.round(data[idx + 2] * factor);
          }
        }
      }
    }
  }

  /**
   * Compose the final output image onto a canvas according to target preset,
   * fit mode ('cover', 'ambient', 'padded'), pan, zoom, and adjustments.
   */
  function renderComposite(sourceImg, targetW, targetH, options = {}) {
    const fitMode = options.fitMode || 'cover';
    const zoom = options.zoom !== undefined ? options.zoom : 1.0;
    const panX = options.panX !== undefined ? options.panX : 0; // -50 to 50 %
    const panY = options.panY !== undefined ? options.panY : 0; // -50 to 50 %
    const bgColor = options.canvasBgColor || '#06050a';
    const adjustments = Object.assign({}, DEFAULT_ADJUSTMENTS, options.adjustments || {});

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const srcW = sourceImg.naturalWidth || sourceImg.width;
    const srcH = sourceImg.naturalHeight || sourceImg.height;

    // FIT MODE 1: Ambient Blur Backdrop
    if (fitMode === 'ambient') {
      // 1. Draw blurred backdrop scaled to cover
      const scaleCover = Math.max(targetW / srcW, targetH / srcH);
      const bgW = srcW * scaleCover;
      const bgH = srcH * scaleCover;
      const bgX = (targetW - bgW) / 2;
      const bgY = (targetH - bgH) / 2;

      // Create a small offscreen canvas to blur quickly without lag
      const blurCanvas = document.createElement('canvas');
      const blurW = Math.max(120, Math.floor(targetW / 4));
      const blurH = Math.max(120, Math.floor(targetH / 4));
      blurCanvas.width = blurW;
      blurCanvas.height = blurH;
      const blurCtx = blurCanvas.getContext('2d');
      blurCtx.imageSmoothingEnabled = true;
      blurCtx.imageSmoothingQuality = 'high';
      blurCtx.drawImage(sourceImg, 0, 0, blurW, blurH);

      // Draw backdrop onto main canvas with CSS canvas filter if available or scaled
      ctx.save();
      if ('filter' in ctx) {
        ctx.filter = 'blur(45px) brightness(0.65)';
      }
      ctx.drawImage(blurCanvas, bgX, bgY, bgW, bgH);
      ctx.restore();

      // Deep luxury dark tint over the blur for seamless obsidian elegance
      ctx.fillStyle = 'rgba(6, 5, 10, 0.45)';
      ctx.fillRect(0, 0, targetW, targetH);

      // Subtle radial dark gradient to focus center
      const radGrad = ctx.createRadialGradient(targetW / 2, targetH / 2, Math.min(targetW, targetH) * 0.2, targetW / 2, targetH / 2, Math.max(targetW, targetH) * 0.7);
      radGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      radGrad.addColorStop(1, 'rgba(6, 5, 10, 0.75)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Draw centered foreground flacon (contain) with pan and zoom
      const scaleContain = Math.min(targetW / srcW, targetH / srcH) * zoom;
      const fgW = srcW * scaleContain;
      const fgH = srcH * scaleContain;
      const offsetX = (panX / 100) * targetW;
      const offsetY = (panY / 100) * targetH;
      const fgX = (targetW - fgW) / 2 + offsetX;
      const fgY = (targetH - fgH) / 2 + offsetY;

      // Soft pedestal shadow beneath the centered flacon
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;
      ctx.drawImage(sourceImg, fgX, fgY, fgW, fgH);
      ctx.restore();

    // FIT MODE 2: Padded Luxury Canvas
    } else if (fitMode === 'padded') {
      // 1. Fill luxury background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Subtle luxury pedestal radial spotlight
      const spotGrad = ctx.createRadialGradient(targetW / 2, targetH * 0.55, 30, targetW / 2, targetH * 0.55, Math.max(targetW, targetH) * 0.6);
      spotGrad.addColorStop(0, 'rgba(201, 169, 110, 0.08)'); // Subtle gold warmth
      spotGrad.addColorStop(0.5, 'rgba(18, 17, 24, 0.4)');
      spotGrad.addColorStop(1, 'rgba(6, 5, 10, 0.95)');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, targetW, targetH);

      // 3. Draw contained flacon with pan & zoom
      const scale = Math.min(targetW / srcW, targetH / srcH) * zoom;
      const fgW = srcW * scale;
      const fgH = srcH * scale;
      const offsetX = (panX / 100) * targetW;
      const offsetY = (panY / 100) * targetH;
      const fgX = (targetW - fgW) / 2 + offsetX;
      const fgY = (targetH - fgH) / 2 + offsetY;

      // Subtle drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 35;
      ctx.shadowOffsetY = 15;
      ctx.drawImage(sourceImg, fgX, fgY, fgW, fgH);
      ctx.restore();

    // FIT MODE 3: Smart Luxury Fill (Cover)
    } else {
      // Scale cover
      const baseScale = Math.max(targetW / srcW, targetH / srcH);
      const effScale = baseScale * zoom;
      const drawW = srcW * effScale;
      const drawH = srcH * effScale;

      const offsetX = (panX / 100) * targetW;
      const offsetY = (panY / 100) * targetH;
      const drawX = (targetW - drawW) / 2 + offsetX;
      const drawY = (targetH - drawH) / 2 + offsetY;

      // Step-down downscale if the image scale is drastically smaller than native
      if (srcW > drawW * 2 && srcH > drawH * 2) {
        // Multi-pass step downscale for maximum bicubic sharpness
        const stepCanvas = stepDownscale(sourceImg, Math.round(drawW), Math.round(drawH));
        ctx.drawImage(stepCanvas, drawX, drawY);
      } else {
        ctx.drawImage(sourceImg, drawX, drawY, drawW, drawH);
      }
    }

    // Step 4: Apply non-destructive studio pixel adjustments
    const hasAdjustments = (
      adjustments.exposure !== 0 ||
      adjustments.contrast !== 0 ||
      adjustments.clarity !== 0 ||
      adjustments.warmth !== 0 ||
      adjustments.saturation !== 0 ||
      adjustments.vignette !== 0 ||
      adjustments.sharpen !== 0
    );

    if (hasAdjustments) {
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      applyStudioAdjustments(imgData, adjustments);
      ctx.putImageData(imgData, 0, 0);
    }

    return canvas;
  }

  /**
   * Encodes a canvas to a WebP Blob with specified quality
   */
  function exportToWebP(canvas, quality = 0.88) {
    return new Promise((resolve, reject) => {
      if (!canvas) {
        reject(new Error('Canvas is null or undefined'));
        return;
      }

      // Check if browser supports WebP canvas export
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to dataURL conversion if toBlob returned null
            try {
              const dataUrl = canvas.toDataURL('image/webp', quality);
              const byteString = atob(dataUrl.split(',')[1]);
              const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              resolve(new Blob([ab], { type: mimeString }));
            } catch (err) {
              reject(err);
            }
          }
        },
        'image/webp',
        quality
      );
    });
  }

  /**
   * Format bytes to readable human strings (KB / MB)
   */
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0 || !bytes) return '0 KB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return {
    PRESETS,
    STUDIO_PROFILES,
    DEFAULT_ADJUSTMENTS,
    renderComposite,
    stepDownscale,
    applyStudioAdjustments,
    exportToWebP,
    formatBytes
  };
});
