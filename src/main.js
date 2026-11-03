import './styles/style.css';
import { createEditor } from './components/editor.js';
import { createOutputPanel } from './components/outputPanel.js';
import { createInspectAstPanel } from './components/inspectAstPanel.js';
import { showToast } from './components/toast.js';
import { parse } from './parser/parser.js';
import { exportTreeAsPng } from './visualizer/treeRenderer.js';

const app = document.querySelector('#app');

function calculateTreeMetrics(node) {
  let count = 0;
  let maxDepth = 0;
  function walk(current, depth) {
    if (!current || typeof current !== 'object') return;
    count += 1;
    if (depth > maxDepth) maxDepth = depth;
    if (current.type === 'BinaryExpression') {
      walk(current.left, depth + 1);
      walk(current.right, depth + 1);
    } else if (current.type === 'UnaryExpression') {
      walk(current.argument, depth + 1);
    }
  }
  walk(node, 1);
  return { count, maxDepth };
}

// App Header matching Stitch design specifications
app.innerHTML = `
  <header class="w-full px-3 sm:px-4 md:px-6 flex items-center justify-between h-14 bg-surface border-b border-outline-variant shadow-sm z-30 flex-shrink-0">
    <div class="flex items-center gap-3 sm:gap-6 min-w-0">
      <div class="flex items-center gap-2 flex-shrink-0">
        <div class="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-sm flex-shrink-0">
          <span class="material-symbols-outlined text-base">account_tree</span>
        </div>
        <span class="text-headline-md font-headline-md text-on-surface tracking-tight whitespace-nowrap">ParseVision</span>
      </div>
    </div>
    <!-- Trailing Actions & Icons -->
    <div class="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
      <div class="hidden lg:flex items-center gap-2 text-label-code-sm font-label-code-sm px-2.5 py-1 rounded-lg neu-recessed text-secondary mr-1 flex-shrink-0 whitespace-nowrap" id="header-stats-pill" aria-live="polite" title="Total AST nodes and maximum tree depth">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Nodes: <strong id="header-node-count">5</strong></span>
        <span class="text-outline-variant">|</span>
        <span>Depth: <strong id="header-max-depth">3</strong></span>
      </div>
      <div class="flex items-center gap-1 sm:gap-1.5 border-l border-outline-variant pl-2 sm:pl-2.5 flex-shrink-0">
        <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant neu-micro transition-all duration-150 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Inspect AST (JSON)" aria-label="Inspect AST as JSON" type="button" id="header-btn-code">
          <span class="material-symbols-outlined text-sm">code</span>
        </button>
        <button class="ml-0.5 sm:ml-1 px-2.5 sm:px-3 h-8 rounded-lg text-label-code-md font-label-code-md neu-micro text-secondary hover:text-primary transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0 whitespace-nowrap" type="button" id="header-btn-export-png" title="Export AST as PNG" aria-label="Export AST as PNG">
          <span class="material-symbols-outlined text-base">download</span>
          <span class="hidden sm:inline">Export PNG</span>
          <span class="sm:hidden">Export</span>
        </button>
      </div>
    </div>
  </header>
  <!-- Main Workspace -->
  <main class="flex-1 flex flex-col p-3 sm:p-4 md:px-6 md:py-4 gap-3 sm:gap-4 w-full min-h-0 overflow-y-auto" id="pv-workspace-container"></main>
`;

const container = app.querySelector('#pv-workspace-container');
const headerNodeCount = app.querySelector('#header-node-count');
const headerMaxDepth = app.querySelector('#header-max-depth');
const headerBtnExportPng = app.querySelector('#header-btn-export-png');
const headerBtnCode = app.querySelector('#header-btn-code');

// Instantiate Components:
// 1. Toolbar & Expression Controller
// 2. AST Visualization Canvas with integrated Traversal Controls
const editor = createEditor({
  initialValue: 'a + b * 2',
  onSelectExample() {
    generate();
  }
});

const output = createOutputPanel();
const inspectAst = createInspectAstPanel({
  triggerButton: headerBtnCode
});

// Mount panels to workspace container (bottom inspector completely removed from page layout)
container.append(editor.element, output.element);

// Mount modal popup outside the main workspace flow
document.body.appendChild(inspectAst.element);

let currentAst = null;

function updateExportState(hasAst) {
  if (headerBtnExportPng) {
    headerBtnExportPng.disabled = !hasAst;
    if (hasAst) {
      headerBtnExportPng.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
      headerBtnExportPng.classList.add('cursor-pointer');
      headerBtnExportPng.removeAttribute('aria-disabled');
      headerBtnExportPng.title = 'Export AST as PNG';
      headerBtnExportPng.setAttribute('aria-label', 'Export AST as PNG');
    } else {
      headerBtnExportPng.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
      headerBtnExportPng.classList.remove('cursor-pointer');
      headerBtnExportPng.setAttribute('aria-disabled', 'true');
      headerBtnExportPng.title = 'No AST available to export';
      headerBtnExportPng.setAttribute('aria-label', 'Export AST as PNG (disabled)');
    }
  }
}

function generate() {
  const source = editor.input.value.trim();
  const startTime = performance.now();

  try {
    const ast = parse(source);
    currentAst = ast;
    output.container.__currentAst = ast;
    if (typeof window !== 'undefined') {
      window.__parsevision_ast = ast;
    }
    updateExportState(true);

    const parseTime = Math.max(0.8, (performance.now() - startTime)).toFixed(1);

    // 1. Render AST Canvas with integrated traversal initialized
    output.updateAst(ast);

    const metrics = calculateTreeMetrics(ast);
    output.setMetrics(metrics.count, metrics.maxDepth);
    if (headerNodeCount) headerNodeCount.textContent = String(metrics.count);
    if (headerMaxDepth) headerMaxDepth.textContent = String(metrics.maxDepth);

    // 2. Update telemetry
    editor.setDiagnostic(true, '', parseTime);

    // 3. Update JSON Inspector
    inspectAst.update(ast, source);
  } catch (error) {
    currentAst = null;
    output.container.__currentAst = null;
    if (typeof window !== 'undefined') {
      window.__parsevision_ast = null;
    }
    updateExportState(false);

    output.clearAst();
    output.setMetrics(0, 0);
    if (headerNodeCount) headerNodeCount.textContent = '0';
    if (headerMaxDepth) headerMaxDepth.textContent = '0';

    editor.setDiagnostic(false, error.message || 'Syntax error');
    inspectAst.clear('No AST generated due to error.');
  }
}

function clear() {
  currentAst = null;
  output.container.__currentAst = null;
  if (typeof window !== 'undefined') {
    window.__parsevision_ast = null;
  }
  updateExportState(false);

  editor.input.value = '';
  output.clearAst();
  output.setMetrics(0, 0);
  if (headerNodeCount) headerNodeCount.textContent = '0';
  if (headerMaxDepth) headerMaxDepth.textContent = '0';

  editor.setDiagnostic(true, 'Editor reset. Ready for input.', '0.0');
  inspectAst.clear();
  editor.input.focus();
}

// Event Listeners
editor.button.addEventListener('click', generate);
editor.clearButton.addEventListener('click', clear);

editor.input.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    generate();
  }
});

async function handleExportPng() {
  if (!currentAst) {
    showToast('No AST available to export.');
    return;
  }
  showToast('Exporting AST as PNG...');
  try {
    const success = await exportTreeAsPng(output.container, 'parsevision-ast.png', currentAst);
    if (success) {
      showToast('AST exported as PNG successfully!');
    } else {
      showToast('Failed to export PNG.');
    }
  } catch {
    showToast('Failed to export PNG.');
  }
}

if (headerBtnExportPng) {
  headerBtnExportPng.addEventListener('click', handleExportPng);
}

if (headerBtnCode) {
  headerBtnCode.addEventListener('click', () => {
    inspectAst.toggle();
  });
}

// Initial parse on application load
generate();

if (typeof window !== 'undefined') {
  if (window.location.hash === '#inspect' || new URLSearchParams(window.location.search).has('inspect')) {
    inspectAst.open();
  }
}
