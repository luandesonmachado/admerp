// API wrapper with JWT token injection
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('adm_token');
}

async function api(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('adm_token');
    localStorage.removeItem('adm_user');
    window.location.href = '/login.html';
    throw new Error('Sessão expirada');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

const API = {
  // Auth
  login: (username, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => api('/auth/me'),

  // Users
  getUsers: () => api('/users'),
  createUser: (data) => api('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => api(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => api(`/users/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: () => api('/clients'),
  createClient: (data) => api('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => api(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id) => api(`/clients/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
    const qs = query.toString();
    return api(`/tasks${qs ? '?' + qs : ''}`);
  },
  getTask: (id) => api(`/tasks/${id}`),
  createTask: (data) => api('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  moveTask: (id, status, position) => api(`/tasks/${id}/position`, { method: 'PATCH', body: JSON.stringify({ status, position }) }),
  deleteTask: (id) => api(`/tasks/${id}`, { method: 'DELETE' }),
  getProjects: () => api('/tasks/projects'),
};
