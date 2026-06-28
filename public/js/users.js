// ═══════════════════════════════════
// USERS.JS — User Management Page
// ═══════════════════════════════════

let usersData = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    document.querySelector('.content-area').innerHTML = `
      <div class="empty-state" style="padding-top:5rem">
        <div class="empty-state-icon">🔒</div>
        <div class="empty-state-text">Acesso restrito a administradores</div>
      </div>`;
    return;
  }

  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = 'Administrador';
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();

  await loadUsersList();
});

async function loadUsersList() {
  try {
    usersData = await API.getUsers();
    renderUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderUsers() {
  const container = document.getElementById('usersList');
  const currentUser = getCurrentUser();

  container.innerHTML = usersData.map(u => {
    const isSelf = u.id === currentUser.id;
    return `
      <div class="user-card ${!u.active ? 'user-inactive' : ''}">
        <div class="user-avatar" style="${!u.active ? 'opacity:0.4' : ''}">${(u.name || 'U').charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${escapeHtml(u.name)} ${isSelf ? '<span style="font-size:11px;color:#999">(você)</span>' : ''}</div>
          <div class="user-username">@${escapeHtml(u.username)} ${!u.active ? '· <span style="color:var(--red)">Inativo</span>' : ''}</div>
        </div>
        <span class="user-role-badge ${u.role}">${u.role === 'admin' ? 'Admin' : 'Usuário'}</span>
        <div class="user-actions">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editUser(${u.id})" title="Editar">✎</button>
          ${!isSelf && u.active ? `<button class="btn btn-danger btn-sm btn-icon" onclick="deactivateUser(${u.id}, '${escapeHtml(u.name)}')" title="Desativar">✕</button>` : ''}
          ${!isSelf && !u.active ? `<button class="btn btn-secondary btn-sm btn-icon" onclick="reactivateUser(${u.id})" title="Reativar" style="color:var(--green)">↻</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── USER MODAL ──
function openUserModal() {
  document.getElementById('editUserId').value = '';
  document.getElementById('editUserName').value = '';
  document.getElementById('editUserUsername').value = '';
  document.getElementById('editUserPassword').value = '';
  document.getElementById('editUserRole').value = 'user';
  document.getElementById('userModalTitle').textContent = 'Novo Usuário';
  document.getElementById('passwordLabel').textContent = 'Senha *';
  document.getElementById('editUserPassword').required = true;
  document.getElementById('userModal').classList.add('open');
}

function editUser(userId) {
  const u = usersData.find(x => x.id === userId);
  if (!u) return;

  document.getElementById('editUserId').value = u.id;
  document.getElementById('editUserName').value = u.name;
  document.getElementById('editUserUsername').value = u.username;
  document.getElementById('editUserPassword').value = '';
  document.getElementById('editUserRole').value = u.role;
  document.getElementById('userModalTitle').textContent = 'Editar Usuário';
  document.getElementById('passwordLabel').textContent = 'Senha (deixe vazio para manter)';
  document.getElementById('editUserPassword').required = false;
  document.getElementById('userModal').classList.add('open');
}

function closeUserModal() {
  document.getElementById('userModal').classList.remove('open');
}

async function saveUser() {
  const id = document.getElementById('editUserId').value;
  const data = {
    name: document.getElementById('editUserName').value.trim(),
    username: document.getElementById('editUserUsername').value.trim(),
    role: document.getElementById('editUserRole').value,
  };
  const password = document.getElementById('editUserPassword').value;

  if (!data.name || !data.username) return showToast('Nome e usuário são obrigatórios', 'error');

  if (password) data.password = password;
  else if (!id) return showToast('Senha é obrigatória para novos usuários', 'error');

  try {
    if (id) {
      await API.updateUser(id, data);
      showToast('Usuário atualizado');
    } else {
      await API.createUser(data);
      showToast('Usuário criado');
    }
    closeUserModal();
    await loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deactivateUser(userId, name) {
  showConfirm(
    'Desativar Usuário',
    `Deseja realmente desativar o usuário "${name}"?`,
    async () => {
      try {
        await API.deleteUser(userId);
        showToast('Usuário desativado');
        await loadUsersList();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  );
}

async function reactivateUser(userId) {
  try {
    await API.updateUser(userId, { active: 1 });
    showToast('Usuário reativado');
    await loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Close modal events
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});
