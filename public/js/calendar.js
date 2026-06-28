// ═══════════════════════════════════
// CALENDAR VIEW
// ═══════════════════════════════════

let calendarDate = new Date();

function renderCalendar(tasks) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Build task map by date
  const tasksByDate = {};
  tasks.forEach(t => {
    if (t.due_date) {
      if (!tasksByDate[t.due_date]) tasksByDate[t.due_date] = [];
      tasksByDate[t.due_date].push(t);
    }
  });

  // Build calendar days
  let days = [];

  // Previous month fill
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    days.push({ day, dateStr, otherMonth: true });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    days.push({ day: d, dateStr, otherMonth: false, isToday: dateStr === todayStr });
  }

  // Next month fill
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    days.push({ day: d, dateStr, otherMonth: true });
  }

  const html = `
    <div class="calendar-header">
      <div class="calendar-nav">
        <button class="calendar-nav-btn" onclick="calendarPrev()">◀</button>
        <span class="calendar-month-title">${monthNames[month]} ${year}</span>
        <button class="calendar-nav-btn" onclick="calendarNext()">▶</button>
      </div>
      <button class="calendar-today-btn" onclick="calendarToday()">Hoje</button>
    </div>
    <div class="calendar-grid">
      ${weekDays.map(w => `<div class="calendar-weekday">${w}</div>`).join('')}
      ${days.map(d => {
        const dayTasks = tasksByDate[d.dateStr] || [];
        const cls = [
          'calendar-day',
          d.otherMonth ? 'other-month' : '',
          d.isToday ? 'today' : ''
        ].filter(Boolean).join(' ');

        return `<div class="${cls}">
          <div class="calendar-day-num">${d.day}</div>
          ${dayTasks.slice(0, 3).map(t => `
            <div class="calendar-task-chip ${t.priority}" onclick="openTaskModal(${t.id})" title="${escapeHtml(t.title)}">
              ${escapeHtml(t.title)}
            </div>
          `).join('')}
          ${dayTasks.length > 3 ? `<div style="font-size:10px;color:#999;padding-left:6px">+${dayTasks.length - 3} mais</div>` : ''}
        </div>`;
      }).join('')}
    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;
}

function calendarPrev() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCurrentView();
}

function calendarNext() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCurrentView();
}

function calendarToday() {
  calendarDate = new Date();
  renderCurrentView();
}
