import { showToast } from './toast.js';

function countNodes(ast) {
  if (!ast || typeof ast !== 'object') return 0;
  let count = 1;
  if (ast.type === 'BinaryExpression') {
    count += countNodes(ast.left) + countNodes(ast.right);
  } else if (ast.type === 'UnaryExpression') {
    count += countNodes(ast.argument);
  }
  return count;
}

/**
 * Syntax highlighter for AST JSON view.
 */
function highlightJson(json) {
  if (!json) return '';
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'text-[#6D28D9]'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-[#1D4ED8] font-semibold'; // key
      } else {
        cls = 'text-[#047857]'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-[#1D4ED8] font-bold'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-secondary';
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

export { countNodes, highlightJson };

/**
 * AST JSON Inspector Modal Popup.
 * Opened from the navbar inspection button, providing formatted,
 * syntax-highlighted AST JSON inspection, node metadata, and copy functionality.
 */
export function createInspectAstPanel(options = {}) {
  let triggerButton = options.triggerButton || null;
  let isOpen = false;

  if (typeof document === 'undefined') {
    return {
      element: null,
      open: () => {},
      close: () => {},
      toggle: () => {},
      isOpen: () => false,
      update: () => {},
      clear: () => {},
      setTriggerButton: () => {},
      details: { open: false }
    };
  }

  // Modal Backdrop Overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'ast-json-modal';
  modalOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150 hidden';
  modalOverlay.setAttribute('role', 'dialog');
  modalOverlay.setAttribute('aria-modal', 'true');
  modalOverlay.setAttribute('aria-labelledby', 'modal-title-inspect-ast');

  modalOverlay.innerHTML = `
    <!-- Centered Modal Dialog Card -->
    <div class="relative w-full max-w-2xl max-h-[85vh] neu-pane rounded-2xl shadow-2xl border border-[#E3E7F0] flex flex-col overflow-hidden" id="ast-modal-card">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-3 sm:p-4 border-b border-[#E3E7F0] bg-[#F8F9FC] select-none gap-2">
        <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div class="w-7 h-7 flex-shrink-0 rounded-lg bg-primary-container text-white flex items-center justify-center shadow-xs">
            <span class="material-symbols-outlined text-base">code</span>
          </div>
          <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            <h2 class="text-headline-sm font-headline-sm text-on-surface truncate" id="modal-title-inspect-ast">Inspect AST</h2>
            <span class="text-label-code-sm font-label-code-sm px-2 py-0.5 rounded bg-surface-container text-secondary border border-outline-variant font-mono whitespace-nowrap" id="modal-json-meta-badge">5 Nodes | 329 Bytes</span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="hidden md:inline-block text-label-code-sm font-label-code-sm text-secondary">Plain-Object AST</span>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center neu-micro text-secondary hover:text-error transition-all active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" id="btn-modal-close" type="button" title="Close dialog (Escape)" aria-label="Close inspection dialog">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>

      <!-- Scrollable JSON Content Body -->
      <div class="flex-1 overflow-auto p-4 neu-recessed font-label-code-md text-label-code-md max-h-[55vh] leading-relaxed select-text" id="ast-json-body">
        <pre class="text-[#202B40] font-mono whitespace-pre text-xs sm:text-sm" id="ast-json-pre"></pre>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-between p-3 sm:p-3.5 border-t border-[#E3E7F0] bg-[#F8F9FC] select-none text-label-code-sm font-label-code-sm gap-2">
        <span class="text-secondary text-xs hidden sm:inline-block truncate">Plain-Object JSON</span>
        <div class="flex items-center gap-2 ml-auto sm:ml-0 flex-shrink-0">
          <button class="px-3 py-1.5 rounded-lg text-label-code-sm font-label-code-sm text-on-primary neu-button-primary transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" id="btn-modal-copy-json" type="button" title="Copy AST JSON to clipboard" aria-label="Copy AST JSON to clipboard">
            <span class="material-symbols-outlined text-sm">content_copy</span>
            <span>Copy JSON</span>
          </button>
          <button class="px-3 py-1.5 rounded-lg text-label-code-sm font-label-code-sm neu-micro text-secondary hover:text-on-surface transition-all active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" id="btn-modal-done" type="button" title="Close inspection dialog" aria-label="Done (close dialog)">
            Done
          </button>
        </div>
      </div>
    </div>
  `;

  const modalCard = modalOverlay.querySelector('#ast-modal-card');
  const badge = modalOverlay.querySelector('#modal-json-meta-badge');
  const pre = modalOverlay.querySelector('#ast-json-pre');
  const btnClose = modalOverlay.querySelector('#btn-modal-close');
  const btnDone = modalOverlay.querySelector('#btn-modal-done');
  const btnCopy = modalOverlay.querySelector('#btn-modal-copy-json');

  let currentAst = null;
  let rawJson = '';

  function open() {
    if (isOpen) return;
    isOpen = true;
    modalOverlay.classList.remove('hidden');

    if (triggerButton) {
      triggerButton.classList.add('neu-micro-pressed', 'text-primary');
      triggerButton.setAttribute('aria-expanded', 'true');
    }

    btnClose.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    modalOverlay.classList.add('hidden');

    if (triggerButton) {
      triggerButton.classList.remove('neu-micro-pressed', 'text-primary');
      triggerButton.setAttribute('aria-expanded', 'false');
      triggerButton.focus();
    }
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  // Backdrop click closes modal
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      close();
    }
  });

  // Clicking inside card does NOT close
  modalCard.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close buttons
  btnClose.addEventListener('click', close);
  btnDone.addEventListener('click', close);

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  });

  // Copy JSON action
  btnCopy.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!rawJson || rawJson.startsWith('Enter') || rawJson.startsWith('No AST')) {
      showToast('No valid AST JSON to copy');
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(rawJson);
      }
      showToast('AST JSON copied to clipboard!');
    } catch {
      showToast('Copied JSON!');
    }
  });

  function update(ast, source = '') {
    currentAst = ast;
    if (ast) {
      rawJson = JSON.stringify(ast, null, 2);
      const nodes = countNodes(ast);
      const bytes = new Blob([rawJson]).size;
      badge.textContent = `${nodes} ${nodes === 1 ? 'Node' : 'Nodes'} | ${bytes} Bytes`;
      pre.innerHTML = highlightJson(rawJson);
    } else {
      rawJson = 'No AST generated due to error.';
      badge.textContent = '0 Nodes | 0 Bytes';
      pre.textContent = rawJson;
    }
  }

  function clear(message = 'Enter an expression, then select Generate AST.') {
    currentAst = null;
    rawJson = message;
    badge.textContent = '0 Nodes | 0 Bytes';
    pre.textContent = message;
  }

  function setTriggerButton(btn) {
    triggerButton = btn;
    if (triggerButton) {
      triggerButton.setAttribute('aria-haspopup', 'dialog');
      triggerButton.setAttribute('aria-expanded', String(isOpen));
    }
  }

  if (triggerButton) {
    setTriggerButton(triggerButton);
  }

  return {
    element: modalOverlay,
    open,
    close,
    toggle,
    isOpen: () => isOpen,
    update,
    clear,
    setTriggerButton,
    details: {
      get open() {
        return isOpen;
      },
      set open(val) {
        if (val) open();
        else close();
      }
    }
  };
}
