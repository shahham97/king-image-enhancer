/**
 * Kingshyer Atelier Parfums — Main Application Controller
 * Handles Studio Viewport, Interactive Split Slider, Batch Queue & WebP Compression
 */

(function () {
  'use strict';

  // Application State
  const state = {
    queue: [],
    activeId: null,
    currentPreset: 'hero',
    currentRetina: 1,
    currentFit: 'ambient',
    currentViewMode: 'split', // 'split', 'side', 'enhanced'
    splitPosition: 50, // Percentage 0 - 100
    isDraggingSplit: false,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    initialPan: { x: 0, y: 0 },
    zoom: 1.0,
    panX: 0,
    panY: 0,
    quality: 0.88,
    gridVisible: false,
    adjustments: Object.assign({}, KingshyerEngine.DEFAULT_ADJUSTMENTS),
    activeProfile: 'neutral',
    renderRaf: null,
    exportDebounceTimer: null
  };

  // DOM Elements Cache
  const elements = {
    // Stage & Viewport
    stageWrapper: document.getElementById('stageWrapper'),
    canvasStageArea: document.getElementById('canvasStageArea'),
    canvasContainer: document.getElementById('canvasContainer'),
    mainCanvas: document.getElementById('mainCanvas'),
    splitWrapper: document.getElementById('splitWrapper'),
    splitBeforeCanvas: document.getElementById('splitBeforeCanvas'),
    splitDividerLine: document.getElementById('splitDividerLine'),
    sideBySideContainer: document.getElementById('sideBySideContainer'),
    sideCanvasBefore: document.getElementById('sideCanvasBefore'),
    sideCanvasAfter: document.getElementById('sideCanvasAfter'),
    sideRawDimBadge: document.getElementById('sideRawDimBadge'),
    sideEnhancedDimBadge: document.getElementById('sideEnhancedDimBadge'),
    gridOverlay: document.getElementById('gridOverlay'),
    emptyViewportPrompt: document.getElementById('emptyViewportPrompt'),

    // View Toolbar
    btnModeSplit: document.getElementById('btnModeSplit'),
    btnModeSide: document.getElementById('btnModeSide'),
    btnModeEnhanced: document.getElementById('btnModeEnhanced'),
    btnZoomIn: document.getElementById('btnZoomIn'),
    btnZoomOut: document.getElementById('btnZoomOut'),
    btnZoomReset: document.getElementById('btnZoomReset'),
    zoomLevelText: document.getElementById('zoomLevelText'),
    btnToggleGrid: document.getElementById('btnToggleGrid'),

    // Presets & Retinas
    presetsList: document.getElementById('presetsList'),
    badgeTargetDim: document.getElementById('badgeTargetDim'),
    retinaButtons: document.querySelectorAll('.retina-btn'),
    retinaLabel: document.getElementById('retinaLabel'),
    customDimBox: document.getElementById('customDimBox'),
    customWidthInput: document.getElementById('customWidthInput'),
    customHeightInput: document.getElementById('customHeightInput'),
    fitModesContainer: document.getElementById('fitModesContainer'),

    // Studio Sliders & Badges
    sliderClarity: document.getElementById('sliderClarity'),
    valClarity: document.getElementById('valClarity'),
    sliderExposure: document.getElementById('sliderExposure'),
    valExposure: document.getElementById('valExposure'),
    sliderContrast: document.getElementById('sliderContrast'),
    valContrast: document.getElementById('valContrast'),
    sliderWarmth: document.getElementById('sliderWarmth'),
    valWarmth: document.getElementById('valWarmth'),
    sliderSaturation: document.getElementById('sliderSaturation'),
    valSaturation: document.getElementById('valSaturation'),
    sliderVignette: document.getElementById('sliderVignette'),
    valVignette: document.getElementById('valVignette'),
    sliderSharpen: document.getElementById('sliderSharpen'),
    valSharpen: document.getElementById('valSharpen'),
    sliderQuality: document.getElementById('sliderQuality'),
    valQuality: document.getElementById('valQuality'),
    profilesGrid: document.getElementById('profilesGrid'),
    btnResetAdjustments: document.getElementById('btnResetAdjustments'),

    // Telemetry
    telemSourceDim: document.getElementById('telemSourceDim'),
    telemSourceSize: document.getElementById('telemSourceSize'),
    telemOutputDim: document.getElementById('telemOutputDim'),
    telemTargetSize: document.getElementById('telemTargetSize'),
    telemSavings: document.getElementById('telemSavings'),

    // Batch & Actions
    fileInputUpload: document.getElementById('fileInputUpload'),
    btnLoadDemo: document.getElementById('btnLoadDemo'),
    btnEmptyLoadDemo: document.getElementById('btnEmptyLoadDemo'),
    batchDropZone: document.getElementById('batchDropZone'),
    batchCountBadge: document.getElementById('batchCountBadge'),
    batchItemsGrid: document.getElementById('batchItemsGrid'),
    btnClearQueue: document.getElementById('btnClearQueue'),
    btnApplyAll: document.getElementById('btnApplyAll'),
    btnDownloadSingle: document.getElementById('btnDownloadSingle'),
    btnDownloadZip: document.getElementById('btnDownloadZip'),

    // Progress Modal
    progressModal: document.getElementById('progressModal'),
    progressModalTitle: document.getElementById('progressModalTitle'),
    progressBarFill: document.getElementById('progressBarFill'),
    progressStatusText: document.getElementById('progressStatusText')
  };

  /**
   * Calculate Target Resolution for current preset and retina scale
   */
  function getTargetResolution(presetKey = state.currentPreset, retina = state.currentRetina) {
    const preset = KingshyerEngine.PRESETS[presetKey] || KingshyerEngine.PRESETS.hero;
    if (preset.id === 'custom') {
      const w = parseInt(elements.customWidthInput.value, 10) || 1200;
      const h = parseInt(elements.customHeightInput.value, 10) || 1200;
      return { width: Math.round(w * (retina === 2 ? 1.5 : 1)), height: Math.round(h * (retina === 2 ? 1.5 : 1)) };
    }
    const width = retina === 2 ? preset.width2x : preset.width1x;
    const height = retina === 2 ? preset.height2x : preset.height1x;
    return { width, height };
  }

  /**
   * Get Active Item in Queue
   */
  function getActiveItem() {
    return state.queue.find((item) => item.id === state.activeId) || null;
  }

  /**
   * Add image file or blob to the batch queue
   */
  async function addImageToQueue(fileOrBlob, fileName) {
    const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const name = fileName || fileOrBlob.name || 'kingshyer-flacon.jpg';
    const objectUrl = URL.createObjectURL(fileOrBlob);

    // Load HTMLImageElement to read native dimensions
    const img = new Image();
    img.src = objectUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const item = {
      id,
      name,
      blob: fileOrBlob,
      size: fileOrBlob.size,
      objectUrl,
      imgElement: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      preset: state.currentPreset,
      retina: state.currentRetina,
      fitMode: state.currentFit,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      adjustments: Object.assign({}, state.adjustments),
      webpBlob: null,
      webpSize: null,
      savingsPct: null,
      status: 'ready'
    };

    state.queue.push(item);

    // If first item added, make it active
    if (!state.activeId) {
      setActiveItem(item.id);
    } else {
      renderBatchQueue();
    }

    return item;
  }

  /**
   * Set Active Item in Workspace
   */
  function setActiveItem(id) {
    const item = state.queue.find((i) => i.id === id);
    if (!item) return;

    state.activeId = id;
    state.zoom = item.zoom;
    state.panX = item.panX;
    state.panY = item.panY;
    state.currentPreset = item.preset || state.currentPreset;
    state.currentRetina = item.retina || state.currentRetina;
    state.currentFit = item.fitMode || state.currentFit;
    state.adjustments = Object.assign({}, item.adjustments);

    syncControlsToState();
    elements.emptyViewportPrompt.style.display = 'none';
    elements.canvasStageArea.style.display = 'flex';

    renderBatchQueue();
    scheduleRender();
  }

  /**
   * Sync UI Controls with current state
   */
  function syncControlsToState() {
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === state.currentPreset);
    });
    elements.customDimBox.style.display = state.currentPreset === 'custom' ? 'grid' : 'none';

    // Retina buttons
    elements.retinaButtons.forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.retina, 10) === state.currentRetina);
    });
    elements.retinaLabel.textContent = state.currentRetina === 2 ? '2x Ultra Retina HD' : '1x Standard';

    // Fit Mode buttons
    document.querySelectorAll('.fit-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.fit === state.currentFit);
    });

    // Dimension badge
    const targetDim = getTargetResolution();
    elements.badgeTargetDim.textContent = `${targetDim.width} × ${targetDim.height} px`;
    elements.telemOutputDim.textContent = `${targetDim.width} × ${targetDim.height} px`;

    // Sliders
    elements.sliderClarity.value = state.adjustments.clarity || 0;
    elements.valClarity.textContent = state.adjustments.clarity || 0;

    elements.sliderExposure.value = state.adjustments.exposure || 0;
    elements.valExposure.textContent = (state.adjustments.exposure || 0) + '%';

    elements.sliderContrast.value = state.adjustments.contrast || 0;
    elements.valContrast.textContent = (state.adjustments.contrast || 0) + '%';

    elements.sliderWarmth.value = state.adjustments.warmth || 0;
    elements.valWarmth.textContent = state.adjustments.warmth || 0;

    elements.sliderSaturation.value = state.adjustments.saturation || 0;
    elements.valSaturation.textContent = (state.adjustments.saturation || 0) + '%';

    elements.sliderVignette.value = state.adjustments.vignette || 0;
    elements.valVignette.textContent = (state.adjustments.vignette || 0) + '%';

    elements.sliderSharpen.value = state.adjustments.sharpen || 0;
    elements.valSharpen.textContent = (state.adjustments.sharpen || 0) + '%';

    elements.sliderQuality.value = Math.round(state.quality * 100);
    elements.valQuality.textContent = Math.round(state.quality * 100) + '%';

    elements.zoomLevelText.textContent = Math.round(state.zoom * 100) + '%';
  }

  /**
   * Schedule Canvas Render using requestAnimationFrame (Silky smooth 60fps)
   */
  function scheduleRender() {
    if (state.renderRaf) {
      cancelAnimationFrame(state.renderRaf);
    }
    state.renderRaf = requestAnimationFrame(renderStudioViewports);
  }

  /**
   * Render Canvas Stage Viewports (Enhanced Main Canvas + Before Split Canvas / Side-by-Side)
   */
  function renderStudioViewports() {
    const item = getActiveItem();
    if (!item || !item.imgElement) {
      elements.emptyViewportPrompt.style.display = 'flex';
      elements.canvasStageArea.style.display = 'none';
      return;
    }

    elements.emptyViewportPrompt.style.display = 'none';
    elements.canvasStageArea.style.display = 'flex';

    const { width: targetW, height: targetH } = getTargetResolution();

    // 1. Render Enhanced Canvas
    const enhancedOptions = {
      fitMode: state.currentFit,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      canvasBgColor: state.adjustments.canvasBgColor || '#06050a',
      adjustments: state.adjustments
    };

    const renderedCanvas = KingshyerEngine.renderComposite(item.imgElement, targetW, targetH, enhancedOptions);

    // 2. Render Unadjusted Raw Canvas if needed
    let rawCanvas = null;
    if (state.currentViewMode === 'split' || state.currentViewMode === 'side') {
      const rawOptions = {
        fitMode: state.currentFit,
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        canvasBgColor: '#06050a',
        adjustments: KingshyerEngine.DEFAULT_ADJUSTMENTS // Zero adjustments
      };
      rawCanvas = KingshyerEngine.renderComposite(item.imgElement, targetW, targetH, rawOptions);
    }

    // 3. Viewport Mode Handling
    if (state.currentViewMode === 'side') {
      elements.canvasContainer.style.display = 'none';
      elements.sideBySideContainer.style.display = 'flex';

      // Left Raw Canvas
      elements.sideCanvasBefore.width = targetW;
      elements.sideCanvasBefore.height = targetH;
      const rawCtx = elements.sideCanvasBefore.getContext('2d');
      rawCtx.drawImage(rawCanvas, 0, 0);
      elements.sideRawDimBadge.textContent = `${targetW} × ${targetH} px`;

      // Right Enhanced Canvas
      elements.sideCanvasAfter.width = targetW;
      elements.sideCanvasAfter.height = targetH;
      const enhCtx = elements.sideCanvasAfter.getContext('2d');
      enhCtx.drawImage(renderedCanvas, 0, 0);
      elements.sideEnhancedDimBadge.textContent = `${targetW} × ${targetH} px`;

    } else {
      elements.sideBySideContainer.style.display = 'none';
      elements.canvasContainer.style.display = 'inline-block';

      // Copy to main display canvas
      const mainCtx = elements.mainCanvas.getContext('2d');
      elements.mainCanvas.width = targetW;
      elements.mainCanvas.height = targetH;
      mainCtx.drawImage(renderedCanvas, 0, 0);

      if (state.currentViewMode === 'split') {
        const splitCtx = elements.splitBeforeCanvas.getContext('2d');
        elements.splitBeforeCanvas.width = targetW;
        elements.splitBeforeCanvas.height = targetH;
        splitCtx.drawImage(rawCanvas, 0, 0);

        elements.splitWrapper.style.display = 'block';
        updateSplitDividerClip();
      } else {
        // Enhanced only
        elements.splitWrapper.style.display = 'none';
      }
    }

    // 4. Update Telemetry Numbers
    elements.telemSourceDim.textContent = `${item.width} × ${item.height} px`;
    elements.telemSourceSize.textContent = KingshyerEngine.formatBytes(item.size);
    elements.telemOutputDim.textContent = `${targetW} × ${targetH} px`;

    // 5. Trigger WebP live estimation (debounced)
    debouncedEstimateWebP(renderedCanvas, item);
  }

  /**
   * Update Split Divider and Clip-Path
   */
  function updateSplitDividerClip() {
    if (state.currentViewMode !== 'split') {
      elements.splitBeforeCanvas.style.clipPath = 'none';
      elements.splitDividerLine.style.display = 'none';
      return;
    }

    elements.splitDividerLine.style.display = 'block';
    elements.splitDividerLine.style.left = `${state.splitPosition}%`;
    elements.splitBeforeCanvas.style.clipPath = `polygon(0 0, ${state.splitPosition}% 0, ${state.splitPosition}% 100%, 0 100%)`;
  }

  /**
   * Debounced WebP Compression & File Size Calculation
   */
  function debouncedEstimateWebP(canvas, item) {
    if (state.exportDebounceTimer) {
      clearTimeout(state.exportDebounceTimer);
    }
    state.exportDebounceTimer = setTimeout(async () => {
      try {
        const webpBlob = await KingshyerEngine.exportToWebP(canvas, state.quality);
        const webpSize = webpBlob.size;
        const savingsPct = Math.round(((item.size - webpSize) / item.size) * 100);

        item.webpBlob = webpBlob;
        item.webpSize = webpSize;
        item.savingsPct = savingsPct;

        elements.telemTargetSize.textContent = KingshyerEngine.formatBytes(webpSize);
        elements.telemSavings.textContent = `${savingsPct > 0 ? '-' : '+'}${Math.abs(savingsPct)}% (${KingshyerEngine.formatBytes(item.size - webpSize)} saved)`;

        // Update card in queue
        updateQueueItemBadge(item.id);
      } catch (err) {
        console.warn('WebP estimation note:', err);
      }
    }, 180);
  }

  /**
   * Render Batch Queue UI
   */
  function renderBatchQueue() {
    elements.batchCountBadge.textContent = `${state.queue.length} Flacon${state.queue.length === 1 ? '' : 's'} Queued`;
    elements.batchItemsGrid.innerHTML = '';

    if (state.queue.length === 0) {
      elements.batchItemsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
          No perfume flacons queued yet. Drag & drop images above or click "Add Images" to start batch processing.
        </div>
      `;
      return;
    }

    state.queue.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `batch-item-card ${item.id === state.activeId ? 'active-item' : ''}`;
      card.dataset.id = item.id;

      const presetConfig = KingshyerEngine.PRESETS[item.preset || 'hero'] || KingshyerEngine.PRESETS.hero;
      const targetDim = getTargetResolution(item.preset || 'hero', item.retina || 1);

      card.innerHTML = `
        <div class="item-thumb-box">
          <img src="${item.objectUrl}" alt="${item.name}" class="item-thumb-img">
        </div>
        <div class="item-meta-box">
          <div>
            <div class="item-name" title="${item.name}">${item.name}</div>
            <div class="item-badge-row">
              <span class="item-preset-tag">${presetConfig.badge}</span>
              <span class="item-preset-tag">${targetDim.width}×${targetDim.height}</span>
            </div>
          </div>
          <div class="item-size-info" id="sizeBadge_${item.id}">
            ${KingshyerEngine.formatBytes(item.size)} &rarr; ${item.webpSize ? KingshyerEngine.formatBytes(item.webpSize) : 'Calculating...'}
            ${item.savingsPct ? `<span style="color: #34d399; margin-left: 4px;">(-${item.savingsPct}%)</span>` : ''}
          </div>
          <div class="item-actions-row">
            <button type="button" class="item-btn-icon btn-edit" title="Edit in Studio Viewport">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="item-btn-icon btn-download-item" title="Download WebP">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button type="button" class="item-btn-icon delete btn-remove-item" title="Remove from batch">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Event: Select as active
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          setActiveItem(item.id);
        }
      });

      card.querySelector('.btn-edit').addEventListener('click', () => {
        setActiveItem(item.id);
      });

      card.querySelector('.btn-download-item').addEventListener('click', (e) => {
        e.stopPropagation();
        downloadSingleItem(item);
      });

      card.querySelector('.btn-remove-item').addEventListener('click', (e) => {
        e.stopPropagation();
        removeItemFromQueue(item.id);
      });

      elements.batchItemsGrid.appendChild(card);
    });
  }

  function updateQueueItemBadge(id) {
    const badge = document.getElementById(`sizeBadge_${id}`);
    const item = state.queue.find((i) => i.id === id);
    if (badge && item) {
      badge.innerHTML = `
        ${KingshyerEngine.formatBytes(item.size)} &rarr; ${item.webpSize ? KingshyerEngine.formatBytes(item.webpSize) : 'Calculating...'}
        ${item.savingsPct ? `<span style="color: #34d399; margin-left: 4px;">(-${item.savingsPct}%)</span>` : ''}
      `;
    }
  }

  function removeItemFromQueue(id) {
    const idx = state.queue.findIndex((i) => i.id === id);
    if (idx !== -1) {
      const removed = state.queue.splice(idx, 1)[0];
      if (removed.objectUrl) URL.revokeObjectURL(removed.objectUrl);

      if (state.activeId === id) {
        state.activeId = state.queue.length > 0 ? state.queue[0].id : null;
        if (state.activeId) {
          setActiveItem(state.activeId);
        } else {
          elements.emptyViewportPrompt.style.display = 'flex';
          elements.canvasStageArea.style.display = 'none';
        }
      }
      renderBatchQueue();
    }
  }

  /**
   * Download a single image item as sanitized kingshyer-[preset]-[filename].webp
   */
  async function downloadSingleItem(item) {
    try {
      const targetDim = getTargetResolution(item.preset || state.currentPreset, item.retina || state.currentRetina);
      const options = {
        fitMode: item.fitMode || state.currentFit,
        zoom: item.zoom || 1.0,
        panX: item.panX || 0,
        panY: item.panY || 0,
        canvasBgColor: item.adjustments?.canvasBgColor || '#06050a',
        adjustments: item.adjustments || state.adjustments
      };

      const canvas = KingshyerEngine.renderComposite(item.imgElement, targetDim.width, targetDim.height, options);
      const blob = await KingshyerEngine.exportToWebP(canvas, state.quality);

      const cleanBase = item.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const presetName = (item.preset || state.currentPreset).toLowerCase();
      const downloadName = `kingshyer-${presetName}-${cleanBase}.webp`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Error generating WebP download: ' + err.message);
    }
  }

  /**
   * Batch Process and Download All Queued Flacons as ZIP
   */
  async function processAndDownloadZip() {
    if (state.queue.length === 0) {
      alert('Please add at least one perfume flacon image to the queue.');
      return;
    }

    if (typeof JSZip === 'undefined') {
      alert('JSZip library is initializing. Please wait a moment and try again.');
      return;
    }

    elements.progressModal.classList.add('visible');
    elements.progressBarFill.style.width = '0%';
    elements.progressModalTitle.textContent = 'Generating Kingshyer WebP Collection';

    const zip = new JSZip();
    const total = state.queue.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = state.queue[i];
        elements.progressStatusText.textContent = `Enhancing & encoding flacon ${i + 1} of ${total}: ${item.name}...`;
        elements.progressBarFill.style.width = `${Math.round(((i + 0.3) / total) * 100)}%`;

        // Render composite
        const targetDim = getTargetResolution(item.preset || state.currentPreset, item.retina || state.currentRetina);
        const options = {
          fitMode: item.fitMode || state.currentFit,
          zoom: item.zoom || 1.0,
          panX: item.panX || 0,
          panY: item.panY || 0,
          canvasBgColor: item.adjustments?.canvasBgColor || '#06050a',
          adjustments: item.adjustments || state.adjustments
        };

        const canvas = KingshyerEngine.renderComposite(item.imgElement, targetDim.width, targetDim.height, options);
        const blob = await KingshyerEngine.exportToWebP(canvas, state.quality);

        const cleanBase = item.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
        const presetName = (item.preset || state.currentPreset).toLowerCase();
        const filename = `kingshyer-${presetName}-${cleanBase}.webp`;

        zip.file(filename, blob);

        elements.progressBarFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
        // Allow UI to breathe
        await new Promise((r) => setTimeout(r, 20));
      }

      elements.progressStatusText.textContent = 'Compressing into ZIP archive...';
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `kingshyer-perfume-catalog-webp-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(zipUrl), 8000);

      elements.progressStatusText.textContent = 'Completed successfully!';
      setTimeout(() => {
        elements.progressModal.classList.remove('visible');
      }, 700);

    } catch (err) {
      console.error('Batch ZIP generation failed:', err);
      alert('Batch export encountered an error: ' + err.message);
      elements.progressModal.classList.remove('visible');
    }
  }

  /**
   * Load Kingshyer Sample Flacons Demo
   */
  async function loadDemoFlacons() {
    const demos = [
      { path: 'assets/sample-kingshyer-royal-obsidian.jpg', name: 'kingshyer-royal-obsidian-flacon.jpg' },
      { path: 'assets/sample-kingshyer-royal-emerald.jpg', name: 'kingshyer-royal-emerald-oud.jpg' },
      { path: 'assets/sample-kingshyer-noir-rose.jpg', name: 'kingshyer-noir-rose-atelier.jpg' }
    ];

    for (const demo of demos) {
      try {
        const resp = await fetch(demo.path);
        if (!resp.ok) throw new Error('Fetch failed');
        const blob = await resp.blob();
        await addImageToQueue(blob, demo.name);
      } catch (err) {
        // Fallback for file:// or restricted environments
        try {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const c = document.createElement('canvas');
              c.width = img.naturalWidth || img.width;
              c.height = img.naturalHeight || img.height;
              const ctx = c.getContext('2d');
              ctx.drawImage(img, 0, 0);
              c.toBlob((blob) => {
                if (blob) {
                  addImageToQueue(blob, demo.name).then(resolve);
                } else {
                  reject(new Error('Canvas blob failed'));
                }
              }, 'image/jpeg', 0.95);
            };
            img.onerror = reject;
            img.src = demo.path;
          });
        } catch (fallbackErr) {
          console.warn('Could not auto-load demo image:', demo.name, fallbackErr);
        }
      }
    }
  }

  /**
   * Bind User Interface Events
   */
  function setupEventListeners() {
    // 1. File Upload Handler
    elements.fileInputUpload.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          await addImageToQueue(file, file.name);
        }
      }
      elements.fileInputUpload.value = '';
    });

    // 2. Demo Buttons
    elements.btnLoadDemo.addEventListener('click', loadDemoFlacons);
    elements.btnEmptyLoadDemo.addEventListener('click', loadDemoFlacons);

    // 3. Preset Buttons
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.currentPreset = btn.dataset.preset;
        const item = getActiveItem();
        if (item) item.preset = state.currentPreset;

        const presetDef = KingshyerEngine.PRESETS[state.currentPreset];
        if (presetDef && presetDef.defaultFit) {
          state.currentFit = presetDef.defaultFit;
          if (item) item.fitMode = state.currentFit;
        }

        syncControlsToState();
        renderBatchQueue();
        scheduleRender();
      });
    });

    // Custom dimensions inputs
    elements.customWidthInput.addEventListener('input', () => {
      syncControlsToState();
      scheduleRender();
    });
    elements.customHeightInput.addEventListener('input', () => {
      syncControlsToState();
      scheduleRender();
    });

    // 4. Retina Buttons
    elements.retinaButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.currentRetina = parseInt(btn.dataset.retina, 10);
        const item = getActiveItem();
        if (item) item.retina = state.currentRetina;
        syncControlsToState();
        renderBatchQueue();
        scheduleRender();
      });
    });

    // 5. Fit Modes Buttons
    document.querySelectorAll('.fit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.currentFit = btn.dataset.fit;
        const item = getActiveItem();
        if (item) item.fitMode = state.currentFit;
        syncControlsToState();
        scheduleRender();
      });
    });

    // 6. View Mode Switchers
    elements.btnModeSplit.addEventListener('click', () => {
      state.currentViewMode = 'split';
      elements.btnModeSplit.classList.add('active');
      elements.btnModeSide.classList.remove('active');
      elements.btnModeEnhanced.classList.remove('active');
      scheduleRender();
    });

    elements.btnModeSide.addEventListener('click', () => {
      state.currentViewMode = 'side';
      elements.btnModeSplit.classList.remove('active');
      elements.btnModeSide.classList.add('active');
      elements.btnModeEnhanced.classList.remove('active');
      state.splitPosition = 50;
      scheduleRender();
    });

    elements.btnModeEnhanced.addEventListener('click', () => {
      state.currentViewMode = 'enhanced';
      elements.btnModeSplit.classList.remove('active');
      elements.btnModeSide.classList.remove('active');
      elements.btnModeEnhanced.classList.add('active');
      scheduleRender();
    });

    // 7. Grid Overlay Toggle
    elements.btnToggleGrid.addEventListener('click', () => {
      state.gridVisible = !state.gridVisible;
      elements.gridOverlay.classList.toggle('visible', state.gridVisible);
      elements.btnToggleGrid.classList.toggle('active', state.gridVisible);
    });

    // 8. Interactive Split Slider Dragging
    const handleSplitDrag = (clientX) => {
      const rect = elements.canvasContainer.getBoundingClientRect();
      if (rect.width <= 0) return;
      let pos = ((clientX - rect.left) / rect.width) * 100;
      pos = Math.max(0, Math.min(100, pos));
      state.splitPosition = pos;
      updateSplitDividerClip();
    };

    elements.splitDividerLine.addEventListener('mousedown', (e) => {
      state.isDraggingSplit = true;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (state.isDraggingSplit) {
        handleSplitDrag(e.clientX);
      }
    });

    window.addEventListener('mouseup', () => {
      if (state.isDraggingSplit) {
        state.isDraggingSplit = false;
      }
    });

    // Touch support for split slider
    elements.splitDividerLine.addEventListener('touchstart', (e) => {
      state.isDraggingSplit = true;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (state.isDraggingSplit && e.touches.length > 0) {
        handleSplitDrag(e.touches[0].clientX);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      state.isDraggingSplit = false;
    });

    // 9. Interactive Pan & Zoom on Canvas
    elements.canvasContainer.addEventListener('mousedown', (e) => {
      if (state.isDraggingSplit) return;
      state.isPanning = true;
      state.panStart = { x: e.clientX, y: e.clientY };
      state.initialPan = { x: state.panX, y: state.panY };
      elements.canvasContainer.classList.add('panning');
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isPanning) return;
      const dx = e.clientX - state.panStart.x;
      const dy = e.clientY - state.panStart.y;
      const rect = elements.canvasContainer.getBoundingClientRect();

      // Convert pixel delta into percentage shift
      state.panX = state.initialPan.x + (dx / rect.width) * 100;
      state.panY = state.initialPan.y + (dy / rect.height) * 100;

      // Clamp pan bounds
      state.panX = Math.max(-100, Math.min(100, state.panX));
      state.panY = Math.max(-100, Math.min(100, state.panY));

      const item = getActiveItem();
      if (item) {
        item.panX = state.panX;
        item.panY = state.panY;
      }
      scheduleRender();
    });

    window.addEventListener('mouseup', () => {
      if (state.isPanning) {
        state.isPanning = false;
        elements.canvasContainer.classList.remove('panning');
      }
    });

    // Mouse wheel zoom
    elements.canvasContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      let newZoom = state.zoom * zoomFactor;
      newZoom = Math.max(0.4, Math.min(3.5, newZoom));
      state.zoom = Math.round(newZoom * 100) / 100;

      const item = getActiveItem();
      if (item) item.zoom = state.zoom;

      elements.zoomLevelText.textContent = Math.round(state.zoom * 100) + '%';
      scheduleRender();
    }, { passive: false });

    // Zoom Buttons
    elements.btnZoomIn.addEventListener('click', () => {
      state.zoom = Math.min(3.5, Math.round((state.zoom + 0.15) * 100) / 100);
      const item = getActiveItem();
      if (item) item.zoom = state.zoom;
      elements.zoomLevelText.textContent = Math.round(state.zoom * 100) + '%';
      scheduleRender();
    });

    elements.btnZoomOut.addEventListener('click', () => {
      state.zoom = Math.max(0.4, Math.round((state.zoom - 0.15) * 100) / 100);
      const item = getActiveItem();
      if (item) item.zoom = state.zoom;
      elements.zoomLevelText.textContent = Math.round(state.zoom * 100) + '%';
      scheduleRender();
    });

    elements.btnZoomReset.addEventListener('click', () => {
      state.zoom = 1.0;
      state.panX = 0;
      state.panY = 0;
      const item = getActiveItem();
      if (item) {
        item.zoom = 1.0;
        item.panX = 0;
        item.panY = 0;
      }
      elements.zoomLevelText.textContent = '100%';
      scheduleRender();
    });

    // 10. Studio Adjustment Sliders Listeners
    const bindSlider = (sliderEl, badgeEl, key, suffix = '') => {
      sliderEl.addEventListener('input', () => {
        const val = parseInt(sliderEl.value, 10);
        badgeEl.textContent = val + suffix;
        state.adjustments[key] = val;

        const item = getActiveItem();
        if (item) {
          item.adjustments[key] = val;
        }
        scheduleRender();
      });
    };

    bindSlider(elements.sliderClarity, elements.valClarity, 'clarity');
    bindSlider(elements.sliderExposure, elements.valExposure, 'exposure', '%');
    bindSlider(elements.sliderContrast, elements.valContrast, 'contrast', '%');
    bindSlider(elements.sliderWarmth, elements.valWarmth, 'warmth');
    bindSlider(elements.sliderSaturation, elements.valSaturation, 'saturation', '%');
    bindSlider(elements.sliderVignette, elements.valVignette, 'vignette', '%');
    bindSlider(elements.sliderSharpen, elements.valSharpen, 'sharpen', '%');

    // WebP Quality slider
    elements.sliderQuality.addEventListener('input', () => {
      const q = parseInt(elements.sliderQuality.value, 10);
      elements.valQuality.textContent = q + '%';
      state.quality = q / 100;
      scheduleRender();
    });

    // 11. Luxury Profiles Selection
    document.querySelectorAll('.profile-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.profile-pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const profileKey = btn.dataset.profile;
        const profile = KingshyerEngine.STUDIO_PROFILES[profileKey];
        if (!profile) return;

        state.adjustments.exposure = profile.exposure;
        state.adjustments.contrast = profile.contrast;
        state.adjustments.clarity = profile.clarity;
        state.adjustments.warmth = profile.warmth;
        state.adjustments.saturation = profile.saturation;
        state.adjustments.vignette = profile.vignette;
        state.adjustments.sharpen = profile.sharpen;

        const item = getActiveItem();
        if (item) {
          item.adjustments = Object.assign({}, state.adjustments);
        }

        syncControlsToState();
        scheduleRender();
      });
    });

    // Reset All Adjustments
    elements.btnResetAdjustments.addEventListener('click', () => {
      state.adjustments = Object.assign({}, KingshyerEngine.DEFAULT_ADJUSTMENTS);
      const item = getActiveItem();
      if (item) {
        item.adjustments = Object.assign({}, KingshyerEngine.DEFAULT_ADJUSTMENTS);
      }
      document.querySelectorAll('.profile-pill-btn').forEach((b) => b.classList.remove('active'));
      const neutralBtn = document.querySelector('.profile-pill-btn[data-profile="neutral"]');
      if (neutralBtn) neutralBtn.classList.add('active');

      syncControlsToState();
      scheduleRender();
    });

    // 12. Apply Current Edits to All in Queue
    elements.btnApplyAll.addEventListener('click', () => {
      if (state.queue.length === 0) return;
      state.queue.forEach((item) => {
        item.adjustments = Object.assign({}, state.adjustments);
        item.preset = state.currentPreset;
        item.retina = state.currentRetina;
        item.fitMode = state.currentFit;
      });
      renderBatchQueue();
      alert(`Successfully synchronized luxury studio adjustments across all ${state.queue.length} flacons in queue.`);
    });

    // 13. Download Active Single WebP
    elements.btnDownloadSingle.addEventListener('click', () => {
      const item = getActiveItem();
      if (!item) {
        alert('Please select or upload a flacon image first.');
        return;
      }
      downloadSingleItem(item);
    });

    // 14. Batch ZIP Download
    elements.btnDownloadZip.addEventListener('click', processAndDownloadZip);

    // 15. Clear Queue
    elements.btnClearQueue.addEventListener('click', () => {
      if (state.queue.length === 0) return;
      if (confirm('Clear all queued images from memory?')) {
        state.queue.forEach((item) => {
          if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
        });
        state.queue = [];
        state.activeId = null;
        elements.emptyViewportPrompt.style.display = 'flex';
        elements.canvasStageArea.style.display = 'none';
        renderBatchQueue();
      }
    });

    // 16. Drag and Drop Support across the whole window and drop zone
    const dragTargets = [elements.stageWrapper, elements.batchDropZone, document.body];
    ['dragenter', 'dragover'].forEach((eventName) => {
      dragTargets.forEach((target) => {
        target.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          elements.stageWrapper.classList.add('drag-active');
        });
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dragTargets.forEach((target) => {
        target.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          elements.stageWrapper.classList.remove('drag-active');
        });
      });
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      elements.stageWrapper.classList.remove('drag-active');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            await addImageToQueue(file, file.name);
          }
        }
      }
    });

    // 17. Clipboard Paste Support (Ctrl+V)
    window.addEventListener('paste', async (e) => {
      if (e.clipboardData && e.clipboardData.items) {
        const items = Array.from(e.clipboardData.items);
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              await addImageToQueue(blob, `kingshyer-clipboard-${Date.now()}.png`);
            }
          }
        }
      }
    });
  }

  // Application Initialization
  async function init() {
    setupEventListeners();
    syncControlsToState();
    // Preload demo flacons automatically on initial startup so the studio is immediately alive!
    await loadDemoFlacons();
  }

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
