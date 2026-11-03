/**
 * Accessible toast notification utility for instant user feedback.
 */
let toastTimeout = null;

export function showToast(message, duration = 2200) {
  let toast = document.querySelector('#pv-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pv-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }

  toast.textContent = message;
  toast.classList.add('show', 'is-visible');

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show', 'is-visible');
  }, duration);
}
