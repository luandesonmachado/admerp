// Auth utilities
function isLoggedIn() {
  return !!localStorage.getItem('adm_token');
}

function getCurrentUser() {
  const raw = localStorage.getItem('adm_user');
  return raw ? JSON.parse(raw) : null;
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('adm_token');
  localStorage.removeItem('adm_user');
  window.location.href = '/login.html';
}

// Toast notifications
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Format helpers
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatDateFull(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T23:59:59') < new Date();
}

const STATUS_LABELS = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  review: 'Em Revisão',
  done: 'Concluído'
};

const STATUS_COLORS = {
  todo: '#1389c7',
  in_progress: '#f3822b',
  review: '#daa520',
  done: '#2e9e5b'
};

const PRIORITY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' };
const PRIORITY_COLORS = { high: '#e74c3c', medium: '#ffcd01', low: '#2e9e5b' };

// Custom Confirmation Dialog helper
function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  if (!modal) return;

  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;

  const okBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  const closeConfirm = () => {
    modal.classList.remove('open');
  };

  okBtn.onclick = () => {
    closeConfirm();
    if (onConfirm) onConfirm();
  };

  cancelBtn.onclick = closeConfirm;
  modal.classList.add('open');
}

