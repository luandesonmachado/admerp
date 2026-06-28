// ═══════════════════════════════════
// KANBAN VIEW — Drag & Drop
// ═══════════════════════════════════

function renderKanban(tasks) {
  const statuses = ['todo', 'in_progress', 'review', 'done'];
  const columns = statuses.map(s => ({
    status: s,
    label: STATUS_LABELS[s],
    color: STATUS_COLORS[s],
    tasks: tasks.filter(t => t.status === s)
  }));

  const html = `<div class="kanban-board">
    ${columns.map(col => `
      <div class="kanban-column" data-status="${col.status}">
        <div class="kanban-column-header">
          <span class="kanban-column-title">
            <span class="kanban-column-dot" style="background:${col.color}"></span>
            ${col.label}
          </span>
          <span class="kanban-column-count">${col.tasks.length}</span>
        </div>
        <div class="kanban-cards" data-status="${col.status}"
          ondragover="kanbanDragOver(event)" ondrop="kanbanDrop(event, '${col.status}')"
          ondragleave="kanbanDragLeave(event)">
          ${col.tasks.length === 0 ? `
            <div class="empty-state" style="padding:2rem 0.5rem">
              <div class="empty-state-text">Nenhuma tarefa</div>
            </div>
          ` : col.tasks.map(task => renderTaskCard(task)).join('')}
        </div>
      </div>
    `).join('')}
  </div>`;

  document.getElementById('contentArea').innerHTML = html;
}

function renderTaskCard(task) {
  const overdue = isOverdue(task.due_date) && task.status !== 'done';
  return `
    <div class="task-card" draggable="true" data-id="${task.id}"
      ondragstart="kanbanDragStart(event, ${task.id})"
      ondragend="kanbanDragEnd(event)"
      onclick="openTaskModal(${task.id})">
      <div class="task-card-priority priority-${task.priority}"></div>
      <div class="task-card-title">${escapeHtml(task.title)}</div>
      <div class="task-card-meta">
        ${task.due_date ? `<span class="task-meta-tag due ${overdue ? 'overdue' : ''}">📅 ${formatDate(task.due_date)}</span>` : ''}
        ${task.project ? `<span class="task-meta-tag project">📁 ${escapeHtml(task.project)}</span>` : ''}
        ${task.assigned_name ? `<span class="task-meta-tag user">👤 ${escapeHtml(task.assigned_name)}</span>` : ''}
      </div>
      ${currentClientId === 'all' && task.client_name ? `
        <div class="task-card-client">
          <span class="task-card-client-dot" style="background:${task.client_color || '#999'}"></span>
          ${escapeHtml(task.client_initials || '')}
        </div>
      ` : ''}
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Drag & Drop handlers
let draggedTaskId = null;

function kanbanDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function kanbanDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
}

function kanbanDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function kanbanDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function kanbanDrop(e, newStatus) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  if (!draggedTaskId) return;

  try {
    await API.moveTask(draggedTaskId, newStatus, 0);
    showToast('Tarefa movida com sucesso');
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }

  draggedTaskId = null;
}
