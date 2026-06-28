// ═══════════════════════════════════
// APP.JS — Main Dashboard Logic
// ═══════════════════════════════════

// State
let currentView = 'kanban';
let currentClientId = 'all';
let allClients = [];
let allUsers = [];
let allTasks = [];

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = getCurrentUser();
  if (user) {
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = user.role === 'admin' ? 'Administrador' : 'Usuário';
    document.getElementById('userAvatar').textContent = (user.name || 'U').charAt(0).toUpperCase();
    if (user.role === 'admin') {
      document.getElementById('usersLink').style.display = '';
    }
  }

  await Promise.all([loadClients(), loadUsers()]);
  await loadTasks();
});

// ── CLIENTS ──
async function loadClients() {
  try {
    allClients = await API.getClients();
    renderClientsList();
  } catch (err) {
    console.error('Error loading clients:', err);
  }
}

function renderClientsList() {
  const container = document.getElementById('clientsList');
  let totalPending = 0;

  container.innerHTML = allClients.map(c => {
    totalPending += c.pending_tasks || 0;
    return `
      <button class="sidebar-item ${currentClientId == c.id ? 'active' : ''}" data-client="${c.id}" onclick="selectClient(${c.id})">
        <div class="sidebar-client-avatar" style="background:${c.color}">${escapeHtml(c.initials)}</div>
        ${escapeHtml(c.name)}
        ${c.pending_tasks > 0 ? `<span class="badge">${c.pending_tasks}</span>` : ''}
      </button>
    `;
  }).join('');

  document.getElementById('badgeAll').textContent = totalPending;

  // Update task modal client dropdown
  const taskClientSelect = document.getElementById('taskClient');
  if (taskClientSelect) {
    taskClientSelect.innerHTML = allClients.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join('');
  }
}

function selectClient(clientId) {
  currentClientId = clientId;

  // Update sidebar active state
  document.querySelectorAll('.sidebar-item[data-client]').forEach(el => {
    el.classList.toggle('active', el.dataset.client == clientId);
  });

  // Update header
  if (clientId === 'all') {
    document.getElementById('pageTitle').textContent = 'Visão Geral';
    document.getElementById('pageBadge').style.display = 'none';
  } else {
    const client = allClients.find(c => c.id == clientId);
    document.getElementById('pageTitle').textContent = client ? client.name : 'Cliente';
    document.getElementById('pageBadge').textContent = client ? client.initials : '';
    document.getElementById('pageBadge').style.display = '';
  }

  loadTasks();
}

// ── USERS ──
async function loadUsers() {
  try {
    allUsers = await API.getUsers();
    populateUserFilters();
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

function populateUserFilters() {
  const filterAssigned = document.getElementById('filterAssigned');
  const taskAssigned = document.getElementById('taskAssigned');

  const activeUsers = allUsers.filter(u => u.active);

  if (filterAssigned) {
    filterAssigned.innerHTML = '<option value="">Responsável</option>' +
      activeUsers.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  }

  if (taskAssigned) {
    taskAssigned.innerHTML = '<option value="">Nenhum</option>' +
      activeUsers.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  }
}

// ── TASKS ──
async function loadTasks() {
  try {
    const params = {};
    if (currentClientId !== 'all') params.client_id = currentClientId;

    // Apply active filters
    const status = document.getElementById('filterStatus')?.value;
    const priority = document.getElementById('filterPriority')?.value;
    const assigned = document.getElementById('filterAssigned')?.value;
    const project = document.getElementById('filterProject')?.value;
    const dueFrom = document.getElementById('filterDueFrom')?.value;
    const dueTo = document.getElementById('filterDueTo')?.value;

    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (assigned) params.assigned_to = assigned;
    if (project) params.project = project;
    if (dueFrom) params.due_from = dueFrom;
    if (dueTo) params.due_to = dueTo;

    allTasks = await API.getTasks(params);
    renderCurrentView();
    loadProjects();
  } catch (err) {
    console.error('Error loading tasks:', err);
  }
}

async function loadProjects() {
  try {
    const projects = await API.getProjects();
    const filterProject = document.getElementById('filterProject');
    if (filterProject) {
      const current = filterProject.value;
      filterProject.innerHTML = '<option value="">Projeto</option>' +
        projects.map(p => `<option value="${p}" ${p === current ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading projects:', err);
  }
}

// ── VIEWS ──
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  renderCurrentView();
}

function renderCurrentView() {
  switch (currentView) {
    case 'kanban': renderKanban(allTasks); break;
    case 'calendar': renderCalendar(allTasks); break;
    case 'list': renderList(allTasks); break;
  }
}

// ── FILTERS ──
function toggleFilters() {
  document.getElementById('filterBar').classList.toggle('hidden');
}

function applyFilters() {
  loadTasks();
}

function clearFilters() {
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterPriority').value = '';
  document.getElementById('filterAssigned').value = '';
  document.getElementById('filterProject').value = '';
  document.getElementById('filterDueFrom').value = '';
  document.getElementById('filterDueTo').value = '';
  loadTasks();
}

// ── TASK MODAL ──
async function openTaskModal(taskId = null) {
  const modal = document.getElementById('taskModal');
  const titleEl = document.getElementById('taskModalTitle');
  const deleteBtn = document.getElementById('taskDeleteBtn');

  // Reset form
  document.getElementById('taskId').value = '';
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  document.getElementById('taskStatus').value = 'todo';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskDue').value = '';
  document.getElementById('taskProject').value = '';
  document.getElementById('taskAssigned').value = '';

  if (currentClientId !== 'all' && document.getElementById('taskClient')) {
    document.getElementById('taskClient').value = currentClientId;
  }

  if (taskId) {
    titleEl.textContent = 'Editar Tarefa';
    deleteBtn.style.display = '';
    try {
      const task = await API.getTask(taskId);
      document.getElementById('taskId').value = task.id;
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskDesc').value = task.description || '';
      document.getElementById('taskClient').value = task.client_id;
      document.getElementById('taskStatus').value = task.status;
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskDue').value = task.due_date || '';
      document.getElementById('taskProject').value = task.project || '';
      document.getElementById('taskAssigned').value = task.assigned_to || '';
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  } else {
    titleEl.textContent = 'Nova Tarefa';
    deleteBtn.style.display = 'none';
  }

  modal.classList.add('open');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('open');
}

async function saveTask() {
  const id = document.getElementById('taskId').value;
  const data = {
    title: document.getElementById('taskTitle').value.trim(),
    description: document.getElementById('taskDesc').value.trim(),
    client_id: +document.getElementById('taskClient').value,
    status: document.getElementById('taskStatus').value,
    priority: document.getElementById('taskPriority').value,
    due_date: document.getElementById('taskDue').value || null,
    project: document.getElementById('taskProject').value.trim(),
    assigned_to: document.getElementById('taskAssigned').value ? +document.getElementById('taskAssigned').value : null
  };

  if (!data.title) return showToast('Título é obrigatório', 'error');
  if (!data.client_id) return showToast('Selecione um cliente', 'error');

  try {
    if (id) {
      await API.updateTask(id, data);
      showToast('Tarefa atualizada');
    } else {
      await API.createTask(data);
      showToast('Tarefa criada');
    }
    closeTaskModal();
    await loadClients();
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask() {
  const id = document.getElementById('taskId').value;
  if (!id) return;

  showConfirm(
    'Excluir Tarefa',
    'Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.',
    async () => {
      try {
        await API.deleteTask(id);
        showToast('Tarefa excluída');
        closeTaskModal();
        await loadClients();
        await loadTasks();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  );
}

// ── CLIENT MODAL ──
function openClientModal() {
  document.getElementById('clientName').value = '';
  document.getElementById('clientInitials').value = '';
  document.getElementById('clientColor').value = '#1389c7';
  document.getElementById('clientModal').classList.add('open');
}

function closeClientModal() {
  document.getElementById('clientModal').classList.remove('open');
}

async function saveClient() {
  const name = document.getElementById('clientName').value.trim();
  const initials = document.getElementById('clientInitials').value.trim().toUpperCase();
  const color = document.getElementById('clientColor').value;

  if (!name || !initials) return showToast('Nome e sigla são obrigatórios', 'error');

  try {
    await API.createClient({ name, initials, color });
    showToast('Cliente criado');
    closeClientModal();
    await loadClients();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// Close modals on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});
