// ═══════════════════════════════════
// LIST VIEW — Sortable Table
// ═══════════════════════════════════

let listSortField = 'due_date';
let listSortDir = 'asc';

function renderList(tasks) {
  if (tasks.length === 0) {
    document.getElementById('contentArea').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">Nenhuma tarefa encontrada</div>
      </div>`;
    return;
  }

  // Sort
  const sorted = [...tasks].sort((a, b) => {
    let va = a[listSortField] || '';
    let vb = b[listSortField] || '';
    if (listSortField === 'assigned_name') { va = a.assigned_name || ''; vb = b.assigned_name || ''; }
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return listSortDir === 'asc' ? -1 : 1;
    if (va > vb) return listSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const columns = [
    { key: 'priority', label: 'Prior.' },
    { key: 'title', label: 'Tarefa' },
    { key: 'status', label: 'Status' },
    { key: 'assigned_name', label: 'Responsável' },
    { key: 'project', label: 'Projeto' },
    { key: 'due_date', label: 'Prazo' },
    ...(currentClientId === 'all' ? [{ key: 'client_name', label: 'Cliente' }] : [])
  ];

  const html = `
    <div class="list-table-container">
      <table class="list-table">
        <thead>
          <tr>
            ${columns.map(col => `
              <th class="${listSortField === col.key ? 'sorted' : ''}" onclick="listSort('${col.key}')">
                ${col.label}
                <span class="sort-icon">${listSortField === col.key ? (listSortDir === 'asc' ? '▲' : '▼') : '▲'}</span>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${sorted.map(task => {
            const overdue = isOverdue(task.due_date) && task.status !== 'done';
            return `<tr onclick="openTaskModal(${task.id})">
              <td><span class="list-priority-dot" style="background:${PRIORITY_COLORS[task.priority]}" title="${PRIORITY_LABELS[task.priority]}"></span></td>
              <td style="font-weight:600">${escapeHtml(task.title)}</td>
              <td><span class="list-status-badge status-${task.status}">${STATUS_LABELS[task.status]}</span></td>
              <td>${escapeHtml(task.assigned_name || '—')}</td>
              <td style="color:#999;font-size:12px">${escapeHtml(task.project || '—')}</td>
              <td style="${overdue ? 'color:var(--red);font-weight:600' : ''}">${formatDateFull(task.due_date)}</td>
              ${currentClientId === 'all' ? `<td style="font-size:12px;color:#999">${escapeHtml(task.client_initials || task.client_name || '—')}</td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;
}

function listSort(field) {
  if (listSortField === field) {
    listSortDir = listSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    listSortField = field;
    listSortDir = 'asc';
  }
  renderCurrentView();
}
