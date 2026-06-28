// ═══════════════════════════════════
// CLIENTS.JS — Client Management Logic
// ═══════════════════════════════════

let clientsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = getCurrentUser();
  if (user) {
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = user.role === 'admin' ? 'Administrador' : 'Usuário';
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
    if (user.role === 'admin') {
      document.getElementById('usersLink').style.display = '';
    }
  }

  await loadClientsList();
});

async function loadClientsList() {
  try {
    clientsData = await API.getClients();
    renderClients();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderClients() {
  const container = document.getElementById('clientsList');

  if (clientsData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💼</div>
        <div class="empty-state-text">Nenhum cliente cadastrado</div>
      </div>`;
    return;
  }

  container.innerHTML = clientsData.map(c => `
    <div class="user-card">
      <div class="sidebar-client-avatar" style="background:${c.color};width:44px;height:44px;font-size:16px;border-radius:12px">
        ${escapeHtml(c.initials)}
      </div>
      <div class="user-info">
        <div class="user-name">${escapeHtml(c.name)}</div>
        <div class="user-username">
          Tarefas pendentes: <strong>${c.pending_tasks || 0}</strong>
        </div>
      </div>
      <div class="user-actions">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="editClient(${c.id})" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deactivateClient(${c.id}, '${escapeHtml(c.name)}')" title="Excluir">✕</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── CLIENT MODAL ──
function openClientModal() {
  document.getElementById('editClientId').value = '';
  document.getElementById('editClientName').value = '';
  document.getElementById('editClientInitials').value = '';
  document.getElementById('editClientColor').value = '#1389c7';
  document.getElementById('clientModalTitle').textContent = 'Novo Cliente';
  document.getElementById('clientModal').classList.add('open');
}

function editClient(clientId) {
  const c = clientsData.find(x => x.id === clientId);
  if (!c) return;

  document.getElementById('editClientId').value = c.id;
  document.getElementById('editClientName').value = c.name;
  document.getElementById('editClientInitials').value = c.initials;
  document.getElementById('editClientColor').value = c.color || '#1389c7';
  document.getElementById('clientModalTitle').textContent = 'Editar Cliente';
  document.getElementById('clientModal').classList.add('open');
}

function closeClientModal() {
  document.getElementById('clientModal').classList.remove('open');
}

async function saveClient() {
  const id = document.getElementById('editClientId').value;
  const data = {
    name: document.getElementById('editClientName').value.trim(),
    initials: document.getElementById('editClientInitials').value.trim().toUpperCase(),
    color: document.getElementById('editClientColor').value,
  };

  if (!data.name || !data.initials) return showToast('Nome e sigla são obrigatórios', 'error');

  try {
    if (id) {
      await API.updateClient(id, data);
      showToast('Cliente atualizado');
    } else {
      await API.createClient(data);
      showToast('Cliente criado');
    }
    closeClientModal();
    await loadClientsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deactivateClient(clientId, name) {
  showConfirm(
    'Desativar Cliente',
    `Tem certeza que deseja excluir/desativar o cliente "${name}"?`,
    async () => {
      try {
        await API.deleteClient(clientId);
        showToast('Cliente desativado');
        await loadClientsList();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  );
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
