import { setTreeZoom, renderTree, renderEmptyTree, mapAstToNodeIds, nodeLabel, updateTreeTraversal } from '../visualizer/treeRenderer.js';
import { getLegendItems } from '../visualizer/nodeStyles.js';
import { preorder, inorder, postorder, formatNode } from '../traversal/traversal.js';
import { showToast } from './toast.js';

/**
 * Output panel with integrated Traversal Controls and AST Visualization Canvas.
 * Directly integrates Preorder, Inorder, and Postorder playback, visit step numbering,
 * active node pulse, speed selector, and viewport controls.
 */
export function createOutputPanel(options = {}) {
  if (typeof document === 'undefined') {
    return {
      element: null,
      svg: null,
      container: null,
      viewport: null,
      setMetrics: () => { },
      resetZoom: () => { },
      centerTree: () => { },
      updateAst: () => { },
      clearAst: () => { },
      setMode: () => { },
      getActiveMode: () => options.defaultMode || 'inorder',
      startTraversal: () => { },
      pauseTraversal: () => { },
      resetTraversal: () => { },
      focusTraversalControls: () => { },
      cleanup: () => { }
    };
  }

  const section = document.createElement('section');
  section.className = 'relative neu-pane rounded-xl p-3 md:p-4 flex flex-col flex-1 min-h-[440px] sm:min-h-[400px] bg-grid-dots overflow-hidden w-full';
  section.setAttribute('aria-label', 'AST Visualization Canvas');

  const onNodeClickCallback = typeof options.onNodeClick === 'function' ? options.onNodeClick : null;

  section.innerHTML = `
    <!-- Top Canvas Bar with Embedded Traversal Toolbar & Viewport Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 z-10 select-none pb-2.5 sm:pb-3 border-b border-[#E3E7F0]/80 flex-shrink-0 w-full">
      <!-- Canvas Heading & Tree Layout Badge -->
      <div class="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 min-w-0">
        <span class="text-headline-sm font-headline-sm text-on-surface font-semibold tracking-tight whitespace-nowrap">Syntax Tree Graph</span>
        <span class="text-label-code-sm font-label-code-sm px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-surface-container text-secondary border border-outline-variant whitespace-nowrap" id="viz-hierarchy-badge" title="Tree layout">Tree Layout</span>
      </div>

      <!-- Integrated Controls Cluster -->
      <div class="flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
        <!-- Traversal Toolbar Group -->
        <div class="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 bg-[#F8F9FC] p-1 sm:p-1.5 rounded-lg border border-[#E3E7F0] shadow-sm max-w-full" role="toolbar" aria-label="AST Traversal Controls">
          <!-- Traversal Strategy Selector -->
          <div class="flex items-center p-0.5 bg-[#F1F3F8] rounded-md neu-recessed flex-shrink-0" role="radiogroup" aria-label="Traversal Mode">
            <button class="trav-mode-btn px-2 sm:px-3 h-8 rounded text-label-code-sm font-label-code-sm text-secondary hover:text-on-surface cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap" data-mode="preorder" role="radio" aria-checked="false" id="btn-mode-preorder" title="Preorder (Node → Left → Right)" aria-label="Preorder traversal" type="button">
              Preorder
            </button>
            <button class="trav-mode-btn px-2 sm:px-3 h-8 rounded text-label-code-sm font-label-code-sm neu-micro text-primary font-semibold shadow-xs cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap" data-mode="inorder" role="radio" aria-checked="true" id="btn-mode-inorder" title="Inorder (Left → Node → Right)" aria-label="Inorder traversal" type="button">
              Inorder
            </button>
            <button class="trav-mode-btn px-2 sm:px-3 h-8 rounded text-label-code-sm font-label-code-sm text-secondary hover:text-on-surface cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap" data-mode="postorder" role="radio" aria-checked="false" id="btn-mode-postorder" title="Postorder (Left → Right → Node)" aria-label="Postorder traversal" type="button">
              Postorder
            </button>
          </div>

          <div class="hidden sm:block h-5 w-px bg-outline-variant/60 mx-0.5 flex-shrink-0"></div>

          <!-- Traversal Playback Controls Group -->
          <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <!-- Play / Pause / Replay Button -->
            <button class="px-2.5 sm:px-3.5 h-8 rounded-lg neu-button-primary text-white flex items-center gap-1.5 text-label-code-sm font-label-code-sm font-medium transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap" id="btn-canvas-play" type="button" title="Play traversal animation" aria-label="Play traversal animation">
              <span class="material-symbols-outlined text-base leading-none" id="icon-canvas-play">play_arrow</span>
              <span id="label-canvas-play">Play</span>
            </button>

            <!-- Traversal Progress Indicator (e.g. 0 / 5) -->
            <div class="flex items-center justify-center px-2 sm:px-3 h-8 rounded-lg neu-recessed text-label-code-sm font-label-code-sm font-mono text-secondary flex-shrink-0 whitespace-nowrap" id="trav-progress-indicator" title="Traversal progress (step / total nodes)" aria-live="polite">
              <span id="trav-progress-text">0 / 5</span>
            </div>

            <!-- Playback Speed Selector -->
            <div class="flex items-center gap-0.5 sm:gap-1 pl-0.5 flex-shrink-0" title="Playback speed">
              <button class="trav-speed-btn px-1.5 sm:px-2 h-8 rounded text-label-code-sm font-mono neu-micro-pressed text-primary font-bold cursor-pointer transition-all focus:outline-none" data-speed="1" type="button" title="1x Normal speed" aria-label="1x playback speed" aria-pressed="true">1x</button>
              <button class="trav-speed-btn px-1.5 sm:px-2 h-8 rounded text-label-code-sm font-mono text-secondary hover:text-on-surface cursor-pointer transition-all focus:outline-none" data-speed="1.5" type="button" title="1.5x Fast speed" aria-label="1.5x playback speed" aria-pressed="false">1.5x</button>
              <button class="trav-speed-btn px-1.5 sm:px-2 h-8 rounded text-label-code-sm font-mono text-secondary hover:text-on-surface cursor-pointer transition-all focus:outline-none" data-speed="2" type="button" title="2x High speed" aria-label="2x playback speed" aria-pressed="false">2x</button>
            </div>
          </div>
        </div>

        <div class="hidden lg:block h-6 w-px bg-outline-variant/60 flex-shrink-0"></div>

        <!-- Viewport Controls Group (Zoom) -->
        <div class="flex items-center gap-1 sm:gap-1.5 bg-[#F8F9FC] p-1 sm:p-1.5 rounded-lg border border-[#E3E7F0] shadow-sm flex-shrink-0" role="group" aria-label="Canvas Zoom Controls">
          <button class="w-8 h-8 rounded-lg flex items-center justify-center neu-micro text-secondary hover:text-primary transition-all active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Zoom in (+25%)" type="button" id="btn-tree-zoom-in" aria-label="Zoom in">
            <span class="material-symbols-outlined text-base">add</span>
          </button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center neu-micro text-secondary hover:text-primary transition-all active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Zoom out (-25%)" type="button" id="btn-tree-zoom-out" aria-label="Zoom out">
            <span class="material-symbols-outlined text-base">remove</span>
          </button>
          <div class="h-5 w-px bg-outline-variant/60 mx-0.5"></div>
          <button class="px-2 sm:px-2.5 h-8 rounded-lg flex items-center justify-center neu-micro text-label-code-sm font-label-code-sm font-mono text-secondary hover:text-primary transition-all active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap" title="Reset zoom to 100%" type="button" id="btn-tree-zoom-reset" aria-label="Reset zoom to 100%">
            100%
          </button>
        </div>
      </div>
    </div>

    <!-- Interactive Canvas Coordinate Plane -->
    <div class="relative flex-1 min-h-0 w-full overflow-hidden select-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg" id="tree-canvas-viewport" tabindex="0" role="region" aria-label="AST canvas viewport (drag to pan, Ctrl+Wheel to zoom)">
      <div class="absolute top-0 left-0 origin-top-left select-none pointer-events-auto" id="tree-coordinate-plane">
        <!-- SVG Connecting Lines -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none overflow-visible" id="tree-svg-edges" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="edgeGradient" gradientUnits="userSpaceOnUse" x1="0%" x2="0%" y1="0%" y2="2000">
              <stop offset="0%" stop-color="#94A3B8" stop-opacity="1"></stop>
              <stop offset="100%" stop-color="#CBD5E1" stop-opacity="1"></stop>
            </linearGradient>
          </defs>
          <g class="tree-edges-group"></g>
        </svg>
        <!-- AST Nodes DOM Container -->
        <div id="tree-nodes-container" class="absolute inset-0 pointer-events-auto"></div>
      </div>
    </div>

    <!-- Canvas Footer: Legend of AST Node Classes -->
    <div class="pt-2 sm:pt-2.5 border-t border-[#E3E7F0] flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 z-10 text-label-code-sm font-label-code-sm flex-shrink-0">
      <div class="flex flex-wrap items-center gap-1 sm:gap-1.5">
        <span class="text-secondary font-medium select-none flex-shrink-0 text-xs sm:text-label-code-sm mr-0.5">Node Types:</span>
        <div class="flex flex-wrap items-center gap-1 sm:gap-1.5" id="node-schema-legend">
          ${getLegendItems().map(item => `
            <span class="px-1.5 py-0.5 sm:px-2 rounded border ${item.classNames} select-none whitespace-nowrap text-[10px] sm:text-[11px]" style="background-color: ${item.fill}; color: ${item.text}; border-color: ${item.border};">${item.label}</span>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // DOM Elements
  const canvasViewport = section.querySelector('#tree-canvas-viewport');
  const coordinatePlane = section.querySelector('#tree-coordinate-plane');
  const svg = section.querySelector('#tree-svg-edges');
  const hierarchyBadge = section.querySelector('#viz-hierarchy-badge');

  // Zoom controls
  const btnZoomIn = section.querySelector('#btn-tree-zoom-in');
  const btnZoomOut = section.querySelector('#btn-tree-zoom-out');
  const btnZoomReset = section.querySelector('#btn-tree-zoom-reset');

  // Traversal controls
  const modeButtons = section.querySelectorAll('.trav-mode-btn');
  const btnPlay = section.querySelector('#btn-canvas-play');
  const iconPlay = section.querySelector('#icon-canvas-play');
  const labelPlay = section.querySelector('#label-canvas-play');
  const progressText = section.querySelector('#trav-progress-text');
  const speedButtons = section.querySelectorAll('.trav-speed-btn');

  // Zoom & Pan state
  const MIN_ZOOM = 0.25; // 25%
  const MAX_ZOOM = 3.0;  // 300%
  let currentZoom = 1;
  let panX = 0;
  let panY = 0;

  function applyTransform(zoom, newPanX, newPanY) {
    currentZoom = Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
    panX = Math.round(newPanX);
    panY = Math.round(newPanY);
    setTreeZoom(coordinatePlane, currentZoom, { panX, panY, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM });
    const percent = Math.round(currentZoom * 100);
    btnZoomReset.textContent = `${percent}%`;
    btnZoomReset.title = `Reset zoom to 100% (currently ${percent}%)`;
    btnZoomReset.setAttribute('aria-label', `Reset zoom to 100%, currently ${percent}%`);
  }

  function zoomAt(targetZoom, anchorX, anchorY) {
    const clampedTarget = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);
    if (clampedTarget === currentZoom) return;

    const contentX = (anchorX - panX) / currentZoom;
    const contentY = (anchorY - panY) / currentZoom;

    const nextPanX = anchorX - contentX * clampedTarget;
    const nextPanY = anchorY - contentY * clampedTarget;

    applyTransform(clampedTarget, nextPanX, nextPanY);
  }

  function fitToView() {
    if (!canvasViewport || !coordinatePlane || !currentAst) {
      applyTransform(1, 0, 0);
      return;
    }
    const viewportW = canvasViewport.clientWidth;
    const viewportH = canvasViewport.clientHeight;
    if (!viewportW || !viewportH) {
      return;
    }
    const planeW = coordinatePlane.offsetWidth || 780;
    const planeH = coordinatePlane.offsetHeight || 340;

    const isMobile = viewportW < 640;
    const padX = isMobile ? 16 : 40;
    const padY = isMobile ? 16 : 40;
    const availW = Math.max(100, viewportW - padX * 2);
    const availH = Math.max(100, viewportH - padY * 2);

    const scaleX = availW / planeW;
    const scaleY = availH / planeH;
    const idealScale = Math.min(scaleX, scaleY);

    // On mobile (< 640px), enforce a predictable initial zoom floor (>= 0.75)
    // so AST nodes remain legible and usable instead of shrinking to microscopic specks.
    const initialFloor = isMobile ? 0.75 : MIN_ZOOM;
    const targetZoom = Math.min(Math.max(idealScale, initialFloor), 1.0);

    const renderedW = planeW * targetZoom;
    const renderedH = planeH * targetZoom;

    let nextPanX = Math.round((viewportW - renderedW) / 2);
    let nextPanY = Math.round((viewportH - renderedH) / 2);
    if (isMobile) {
      nextPanY = 20;
    } else {
      if (renderedH > viewportH - 40) {
        nextPanY = 32;
      }
      if (renderedW > viewportW - 40 && nextPanX < 24) {
        nextPanX = 24;
      }
    }

    applyTransform(targetZoom, nextPanX, nextPanY);
  }

  function centerTree() {
    fitToView();
  }

  function resetZoom() {
    if (!canvasViewport || !coordinatePlane) {
      applyTransform(1, 0, 0);
      return;
    }
    const viewportW = canvasViewport.clientWidth || 800;
    const viewportH = canvasViewport.clientHeight || 400;
    const planeW = coordinatePlane.offsetWidth || 780;
    const planeH = coordinatePlane.offsetHeight || 340;

    const nextPanX = Math.round((viewportW - planeW) / 2);
    let nextPanY = Math.round((viewportH - planeH) / 2);
    if (planeH > viewportH - 40) {
      nextPanY = 32;
    }
    applyTransform(1, nextPanX, nextPanY);
  }

  btnZoomIn.addEventListener('click', () => {
    const anchorX = (canvasViewport.clientWidth || 800) / 2;
    const anchorY = (canvasViewport.clientHeight || 400) / 2;
    zoomAt(currentZoom + 0.25, anchorX, anchorY);
  });
  btnZoomOut.addEventListener('click', () => {
    const anchorX = (canvasViewport.clientWidth || 800) / 2;
    const anchorY = (canvasViewport.clientHeight || 400) / 2;
    zoomAt(currentZoom - 0.25, anchorX, anchorY);
  });
  btnZoomReset.addEventListener('click', resetZoom);

  // Wheel / Trackpad Scroll and Ctrl+Wheel Zoom scoped exclusively to AST canvas
  function handleWheel(e) {
    if (e.target.closest('button, input, select, textarea, [role="radiogroup"], [role="toolbar"]')) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      const rect = canvasViewport.getBoundingClientRect();
      const anchorX = e.clientX - rect.left;
      const anchorY = e.clientY - rect.top;

      const delta = -e.deltaY;
      const zoomFactor = delta > 0 ? 1.15 : (1 / 1.15);
      const targetZoom = currentZoom * zoomFactor;

      zoomAt(targetZoom, anchorX, anchorY);
    }
  }

  canvasViewport.addEventListener('wheel', handleWheel, { passive: false });

  // Drag-to-pan Navigation
  let isPanning = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startPanX = 0;
  let startPanY = 0;
  let hasDragged = false;

  function handlePointerDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, select, textarea, [role="radiogroup"], [role="toolbar"]')) return;

    isPanning = true;
    hasDragged = false;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startPanX = panX;
    startPanY = panY;
    try {
      canvasViewport.setPointerCapture(e.pointerId);
    } catch { }
  }

  function handlePointerMove(e) {
    if (!isPanning) return;
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged = true;
    }
    applyTransform(currentZoom, startPanX + dx, startPanY + dy);
  }

  function handlePointerUp(e) {
    if (!isPanning) return;
    isPanning = false;
    try {
      canvasViewport.releasePointerCapture(e.pointerId);
    } catch { }
    if (hasDragged) {
      setTimeout(() => { hasDragged = false; }, 50);
    }
  }

  function handlePointerCancel(e) {
    if (!isPanning) return;
    isPanning = false;
    try {
      canvasViewport.releasePointerCapture(e.pointerId);
    } catch { }
  }

  canvasViewport.addEventListener('pointerdown', handlePointerDown);
  canvasViewport.addEventListener('pointermove', handlePointerMove);
  canvasViewport.addEventListener('pointerup', handlePointerUp);
  canvasViewport.addEventListener('pointercancel', handlePointerCancel);

  // Keyboard navigation when canvas viewport has focus
  function handleCanvasKeydown(e) {
    if (e.target !== canvasViewport) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      applyTransform(currentZoom, panX, panY + 50);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      applyTransform(currentZoom, panX, panY - 50);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      applyTransform(currentZoom, panX + 50, panY);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      applyTransform(currentZoom, panX - 50, panY);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      const anchorX = (canvasViewport.clientWidth || 800) / 2;
      const anchorY = (canvasViewport.clientHeight || 400) / 2;
      zoomAt(currentZoom + 0.25, anchorX, anchorY);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      const anchorX = (canvasViewport.clientWidth || 800) / 2;
      const anchorY = (canvasViewport.clientHeight || 400) / 2;
      zoomAt(currentZoom - 0.25, anchorX, anchorY);
    } else if (e.key === '0') {
      e.preventDefault();
      resetZoom();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      fitToView();
    }
  }

  canvasViewport.addEventListener('keydown', handleCanvasKeydown);

  // ==========================================
  // Integrated Traversal Controller
  // ==========================================
  let currentAst = null;
  let activeMode = options.defaultMode || 'inorder'; // 'inorder' | 'preorder' | 'postorder'
  let steps = []; // [{ id, node, label, type, formatted }]
  let currentStepIndex = -1; // -1 = unstarted / reset; 0..steps.length-1
  let isPlaying = false;
  let playTimer = null;
  let playbackSpeed = 1;
  const BASE_INTERVAL = 800; // ms per step at 1x
  let selectedNodeId = null;

  function computeSteps(ast, mode) {
    if (!ast) return [];
    try {
      const idMap = mapAstToNodeIds(ast);
      let nodes = [];
      if (mode === 'preorder') nodes = preorder(ast, { asNodes: true });
      else if (mode === 'inorder') nodes = inorder(ast, { asNodes: true });
      else if (mode === 'postorder') nodes = postorder(ast, { asNodes: true });

      return nodes.map((node) => {
        const id = idMap.get(node) || 'root';
        const label = nodeLabel(node);
        return {
          id,
          node,
          label,
          type: node.type,
          formatted: formatNode(node)
        };
      });
    } catch {
      return [];
    }
  }

  function updateTraversalUi() {
    const total = steps.length;

    if (!currentAst || total === 0) {
      btnPlay.disabled = true;
      iconPlay.textContent = 'play_arrow';
      labelPlay.textContent = 'Play';
      btnPlay.title = 'Play traversal (no AST)';
      btnPlay.setAttribute('aria-label', 'Play traversal animation (disabled)');
      progressText.textContent = '0 / 0';
      updateTreeTraversal(coordinatePlane, {
        activeNodeId: null,
        visitedMap: new Map(),
        stepNumber: 0,
        selectedNodeId: null
      });
      return;
    }

    btnPlay.disabled = false;

    const isAtEnd = currentStepIndex >= total - 1;
    const isUnstarted = currentStepIndex < 0;

    // Button label and icon
    if (isPlaying) {
      iconPlay.textContent = 'pause';
      labelPlay.textContent = 'Pause';
      btnPlay.title = 'Pause traversal';
      btnPlay.setAttribute('aria-label', 'Pause traversal animation');
    } else if (isAtEnd) {
      iconPlay.textContent = 'replay';
      labelPlay.textContent = 'Replay';
      btnPlay.title = 'Replay traversal from beginning';
      btnPlay.setAttribute('aria-label', 'Replay traversal from beginning');
    } else {
      iconPlay.textContent = 'play_arrow';
      labelPlay.textContent = 'Play';
      btnPlay.title = isUnstarted ? 'Play traversal animation' : 'Resume traversal animation';
      btnPlay.setAttribute('aria-label', isUnstarted ? 'Play traversal animation' : 'Resume traversal animation');
    }

    // Progress counter
    const currentStepDisplay = isUnstarted ? 0 : currentStepIndex + 1;
    progressText.textContent = `${currentStepDisplay} / ${total}`;

    // Visited map for tree node badges
    const visitedMap = new Map();
    if (!isUnstarted) {
      for (let i = 0; i <= currentStepIndex; i++) {
        if (steps[i]) {
          visitedMap.set(steps[i].id, i + 1);
        }
      }
    }

    const activeNodeId = (currentStepIndex >= 0 && steps[currentStepIndex]) ? steps[currentStepIndex].id : null;

    updateTreeTraversal(coordinatePlane, {
      activeNodeId,
      visitedMap,
      stepNumber: currentStepDisplay,
      selectedNodeId
    });
  }

  function pauseTraversal() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    isPlaying = false;
    updateTraversalUi();
  }

  function startTraversal() {
    if (!currentAst || steps.length === 0) return;

    // Prevent concurrent loops
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }

    // If at end or unstarted, restart from 0
    if (currentStepIndex >= steps.length - 1 || currentStepIndex < 0) {
      currentStepIndex = 0;
    }

    isPlaying = true;
    updateTraversalUi();

    const interval = Math.max(150, BASE_INTERVAL / playbackSpeed);

    playTimer = setInterval(() => {
      if (currentStepIndex < steps.length - 1) {
        currentStepIndex += 1;
        updateTraversalUi();
      } else {
        // Traversal finished: stop at final node
        pauseTraversal();
      }
    }, interval);
  }

  function resetTraversal() {
    pauseTraversal();
    currentStepIndex = -1;
    selectedNodeId = null;
    updateTraversalUi();
  }

  function setMode(mode) {
    if (activeMode === mode && steps.length > 0) return;
    pauseTraversal();
    activeMode = mode;

    modeButtons.forEach((btn) => {
      const isTarget = btn.getAttribute('data-mode') === mode;
      btn.setAttribute('aria-checked', String(isTarget));
      btn.setAttribute('tabindex', isTarget ? '0' : '-1');
      if (isTarget) {
        btn.className = 'trav-mode-btn px-2 sm:px-3 h-8 rounded text-label-code-sm font-label-code-sm neu-micro text-primary font-semibold shadow-xs cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap';
      } else {
        btn.className = 'trav-mode-btn px-2 sm:px-3 h-8 rounded text-label-code-sm font-label-code-sm text-secondary hover:text-on-surface cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap';
      }
    });

    if (currentAst) {
      steps = computeSteps(currentAst, activeMode);
    } else {
      steps = [];
    }
    currentStepIndex = -1;
    selectedNodeId = null;
    updateTraversalUi();
  }

  function setSpeed(speed) {
    playbackSpeed = speed;
    speedButtons.forEach((btn) => {
      const btnSpeed = parseFloat(btn.getAttribute('data-speed')) || 1;
      const isSelected = btnSpeed === speed;
      btn.setAttribute('aria-pressed', String(isSelected));
      if (isSelected) {
        btn.className = 'trav-speed-btn px-1.5 sm:px-2 h-8 rounded text-label-code-sm font-mono neu-micro-pressed text-primary font-bold cursor-pointer transition-all focus:outline-none';
      } else {
        btn.className = 'trav-speed-btn px-1.5 sm:px-2 h-8 rounded text-label-code-sm font-mono text-secondary hover:text-on-surface cursor-pointer transition-all focus:outline-none';
      }
    });

    // If currently running, apply speed update immediately
    if (isPlaying) {
      if (playTimer) {
        clearInterval(playTimer);
        playTimer = null;
      }
      const interval = Math.max(150, BASE_INTERVAL / playbackSpeed);
      playTimer = setInterval(() => {
        if (currentStepIndex < steps.length - 1) {
          currentStepIndex += 1;
          updateTraversalUi();
        } else {
          pauseTraversal();
        }
      }, interval);
    }
  }

  // Event Listeners for Traversal Controls
  btnPlay.addEventListener('click', () => {
    if (isPlaying) {
      pauseTraversal();
    } else {
      startTraversal();
    }
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      setMode(mode);
    });
  });

  const modeRadiogroup = section.querySelector('[role="radiogroup"]');
  function handleRadiogroupKeydown(e) {
    const modeArray = Array.from(modeButtons);
    const currentIndex = modeArray.findIndex((b) => b.getAttribute('data-mode') === activeMode);
    let nextIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % modeArray.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + modeArray.length) % modeArray.length;
    }
    if (nextIndex >= 0) {
      const nextBtn = modeArray[nextIndex];
      const nextMode = nextBtn.getAttribute('data-mode');
      setMode(nextMode);
      nextBtn.focus();
    }
  }
  if (modeRadiogroup) {
    modeRadiogroup.addEventListener('keydown', handleRadiogroupKeydown);
  }

  speedButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.getAttribute('data-speed')) || 1;
      setSpeed(speed);
    });
  });

  // Node Click: Semantic Inspection without corrupting traversal
  function handleNodeClick(nodeId) {
    if (hasDragged) return;
    selectedNodeId = nodeId;

    // Find node details from AST
    if (currentAst) {
      const idMap = mapAstToNodeIds(currentAst);
      let targetNode = null;
      for (const [node, path] of idMap.entries()) {
        if (path === nodeId) {
          targetNode = node;
          break;
        }
      }

      if (targetNode) {
        let desc = `${targetNode.type}`;
        if (targetNode.type === 'BinaryExpression') {
          desc = `BinaryExpression: operator '${targetNode.operator}'`;
        } else if (targetNode.type === 'UnaryExpression') {
          desc = `UnaryExpression: operator '${targetNode.operator}'`;
        } else if (targetNode.type === 'Identifier') {
          desc = `Identifier: '${targetNode.name}'`;
        } else if (targetNode.type === 'Literal' || targetNode.type === 'NumericLiteral') {
          desc = `NumericLiteral: '${targetNode.raw ?? targetNode.value}'`;
        }
        showToast(desc);
      }
    }

    if (onNodeClickCallback) {
      onNodeClickCallback(nodeId);
    }

    // Refresh highlighting to show selection ring
    updateTraversalUi();
  }

  function setMetrics(nodeCount, maxDepth) {
    hierarchyBadge.textContent = 'Tree Layout';
    if (nodeCount > 0) {
      hierarchyBadge.title = `Tree layout: ${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'}, depth ${maxDepth}`;
    } else {
      hierarchyBadge.title = 'Tree layout';
    }
  }

  function updateAst(ast) {
    pauseTraversal();
    currentAst = ast;
    coordinatePlane.__currentAst = ast;
    section.__currentAst = ast;
    selectedNodeId = null;
    currentStepIndex = -1;

    if (ast) {
      renderTree(coordinatePlane, ast, {
        onNodeClick: handleNodeClick
      });
      steps = computeSteps(ast, activeMode);
      fitToView();
    } else {
      renderEmptyTree(coordinatePlane);
      steps = [];
      applyTransform(1, 0, 0);
    }

    updateTraversalUi();
  }

  function clearAst() {
    updateAst(null);
  }

  function focusTraversalControls() {
    btnPlay.focus();
  }

  let resizeObserver = null;
  let resizeRaf = null;
  let lastViewportW = 0;
  let lastViewportH = 0;
  if (typeof ResizeObserver !== 'undefined' && canvasViewport) {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries && entries[0];
      const width = entry ? Math.round(entry.contentRect.width) : (canvasViewport.clientWidth || 0);
      const height = entry ? Math.round(entry.contentRect.height) : (canvasViewport.clientHeight || 0);
      if (width === 0 || height === 0) return;
      if (Math.abs(width - lastViewportW) < 2 && Math.abs(height - lastViewportH) < 2) {
        return;
      }
      lastViewportW = width;
      lastViewportH = height;

      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (currentAst && !isPanning && !hasDragged) {
          fitToView();
        }
      });
    });
    resizeObserver.observe(canvasViewport);
  }

  function cleanup() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    isPlaying = false;
    if (resizeRaf) {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    canvasViewport.removeEventListener('wheel', handleWheel);
    canvasViewport.removeEventListener('pointerdown', handlePointerDown);
    canvasViewport.removeEventListener('pointermove', handlePointerMove);
    canvasViewport.removeEventListener('pointerup', handlePointerUp);
    canvasViewport.removeEventListener('pointercancel', handlePointerCancel);
    canvasViewport.removeEventListener('keydown', handleCanvasKeydown);
    if (modeRadiogroup) {
      modeRadiogroup.removeEventListener('keydown', handleRadiogroupKeydown);
    }
  }

  return {
    element: section,
    svg,
    container: coordinatePlane,
    viewport: canvasViewport,
    setMetrics,
    resetZoom,
    centerTree,
    updateAst,
    clearAst,
    setMode,
    getActiveMode: () => activeMode,
    startTraversal,
    pauseTraversal,
    resetTraversal,
    focusTraversalControls,
    cleanup
  };
}
