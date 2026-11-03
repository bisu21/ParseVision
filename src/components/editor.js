export const PRESET_EXPRESSIONS = [
  'a + b * 2',
  '(x + y) * (a - b)',
  '-x * (y + 4)',
  'a - b - c + d',
  '(a + b) * (c - d) / 2'
];

/**
 * Expression editor component designed from Stitch code.html and DESIGN.md.
 */
export function createEditor(options = 'a + b * 2') {
  const initialValue = typeof options === 'string' ? options : (options?.initialValue ?? 'a + b * 2');
  const onSelectExample = typeof options === 'object' && typeof options?.onSelectExample === 'function'
    ? options.onSelectExample
    : null;
  const presets = typeof options === 'object' && Array.isArray(options?.examples)
    ? options.examples
    : PRESET_EXPRESSIONS;

  const section = document.createElement('section');
  section.className = 'neu-pane rounded-xl p-3 sm:p-4 flex flex-col gap-2.5 flex-shrink-0 w-full';
  section.setAttribute('aria-label', 'Expression Editor');

  section.innerHTML = `
    <!-- Top Row: Full-width Expression Input, Action Buttons, and Diagnostic Telemetry -->
    <div id="editor-controls-row" class="editor-controls-row w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 min-w-0">
      <!-- Inset Monospace Expression Input Form -->
      <div id="expression-input-wrapper" class="expression-input-wrapper flex-1 flex items-center neu-recessed rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary-container transition-shadow transition-colors min-w-0">
        <span class="material-symbols-outlined text-secondary text-lg select-none mr-2 flex-shrink-0">function</span>
        <input class="expression-input w-full bg-transparent border-none p-0 text-label-code-lg font-label-code-lg text-on-surface focus:outline-none focus:ring-0 placeholder-secondary" id="expression-input" placeholder="Enter arithmetic expression..." type="text" value="${initialValue}" aria-label="Arithmetic expression"/>
      </div>
      <!-- Primary Action Buttons: Dedicated row on mobile, adjacent on sm+ -->
      <div id="editor-actions-group" class="editor-actions-group flex items-center gap-2 flex-shrink-0 justify-end sm:justify-start">
        <button class="flex-1 sm:flex-initial px-4 h-10 rounded-lg text-label-code-md font-label-code-md text-on-primary neu-button-primary transition-colors transition-transform duration-150 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm font-medium" id="btn-generate-ast" type="button" title="Generate AST from expression (Ctrl+Enter)" aria-label="Generate AST">
          <span class="material-symbols-outlined text-base">auto_awesome</span>
          <span>Generate AST</span>
        </button>
        <button class="px-4 h-10 rounded-lg text-label-code-md font-label-code-md neu-micro text-secondary hover:text-primary transition-colors transition-transform duration-150 active:scale-95 cursor-pointer whitespace-nowrap flex-initial" id="btn-clear-expr" type="button" title="Reset editor and tree visualization" aria-label="Reset editor and visualization">
          Reset
        </button>
      </div>
      <!-- Validation / Error Status: Far right on desktop (lg+), flow row on mobile -->
      <div id="parser-diagnostic" class="parser-diagnostic-wrapper w-full flex items-center gap-2 text-label-code-sm font-label-code-sm text-secondary neu-micro px-3 py-1.5 rounded-lg min-w-0" role="status" aria-live="polite">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" id="parser-status-dot"></span>
        <span id="parser-status-text" class="text-secondary break-words min-w-0 flex-1 leading-snug">Valid arithmetic expression (parsed in <strong>1.2ms</strong>)</span>
      </div>
    </div>
    <!-- Presets Section: Clearly separated second row -->
    <div id="editor-presets-row" class="editor-presets-row flex items-start sm:items-center gap-2 pt-2 border-t border-[#E3E7F0] w-full min-w-0">
      <span class="text-body-sm font-body-sm text-secondary select-none flex-shrink-0 font-medium pt-0.5 sm:pt-0">Presets:</span>
      <div id="preset-chips-container" class="preset-chips-container flex flex-wrap items-center gap-1.5 min-w-0 flex-1"></div>
    </div>
  `;

  const input = section.querySelector('#expression-input');
  const button = section.querySelector('#btn-generate-ast');
  const clearButton = section.querySelector('#btn-clear-expr');
  const diagnostic = section.querySelector('#parser-diagnostic');
  const diagnosticDot = section.querySelector('#parser-status-dot');
  const diagnosticText = section.querySelector('#parser-status-text');
  const chipsContainer = section.querySelector('#preset-chips-container');
  const exampleButtons = [];

  for (let i = 0; i < presets.length; i++) {
    const expr = presets[i];
    const chip = document.createElement('button');
    chip.type = 'button';
    // First preset active by default
    if (i === 0) {
      chip.className = 'preset-btn px-2.5 py-1 rounded text-label-code-sm font-label-code-sm neu-micro-pressed text-primary font-semibold border border-primary-container bg-surface-container cursor-pointer whitespace-nowrap select-none';
    } else {
      chip.className = 'preset-btn px-2.5 py-1 rounded text-label-code-sm font-label-code-sm neu-micro text-on-surface-variant hover:text-primary transition-all cursor-pointer whitespace-nowrap select-none';
    }
    chip.textContent = expr;
    chip.title = `Load preset: ${expr}`;
    chip.setAttribute('aria-label', `Load expression: ${expr}`);
    chip.addEventListener('click', () => {
      // Update active preset styling
      section.querySelectorAll('.preset-btn').forEach((btn) => {
        btn.className = 'preset-btn px-2.5 py-1 rounded text-label-code-sm font-label-code-sm neu-micro text-on-surface-variant hover:text-primary transition-all cursor-pointer whitespace-nowrap select-none';
      });
      chip.className = 'preset-btn px-2.5 py-1 rounded text-label-code-sm font-label-code-sm neu-micro-pressed text-primary font-semibold border border-primary-container bg-surface-container cursor-pointer whitespace-nowrap select-none';

      input.value = expr;
      input.focus();
      if (onSelectExample) {
        onSelectExample(expr);
      }
    });
    chipsContainer.append(chip);
    exampleButtons.push(chip);
  }

  function setDiagnostic(valid = true, message = '', parseTimeMs = '1.2') {
    if (valid) {
      diagnosticDot.className = 'inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0';
      diagnosticText.innerHTML = message
        ? `<span class="break-words">${message}</span>`
        : `Valid arithmetic expression (parsed in <strong>${parseTimeMs}ms</strong>)`;
      diagnostic.className = 'parser-diagnostic-wrapper w-full flex items-center gap-2 text-label-code-sm font-label-code-sm text-secondary neu-micro px-3 py-1.5 rounded-lg min-w-0';
      diagnostic.setAttribute('role', 'status');
      diagnostic.setAttribute('aria-live', 'polite');
    } else {
      diagnosticDot.className = 'inline-block w-2 h-2 rounded-full bg-rose-500 flex-shrink-0';
      diagnosticText.innerHTML = `<span class="text-rose-600 font-semibold break-words">${message}</span>`;
      diagnostic.className = 'parser-diagnostic-wrapper w-full flex items-center gap-2 text-label-code-sm font-label-code-sm text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg min-w-0';
      diagnostic.setAttribute('role', 'alert');
      diagnostic.setAttribute('aria-live', 'assertive');
    }
  }

  function setStatus(message) {
    setDiagnostic(true, message);
  }

  function clearStatus() {
    setDiagnostic(true, '');
  }

  return {
    element: section,
    input,
    button,
    clearButton,
    exampleButtons,
    setDiagnostic,
    setStatus,
    clearStatus
  };
}
