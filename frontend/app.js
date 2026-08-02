const API_BASE = '/api/todos';

const els = {
  form: document.getElementById('todo-form'),
  titleInput: document.getElementById('title-input'),
  descInput: document.getElementById('description-input'),
  formError: document.getElementById('form-error'),
  list: document.getElementById('todo-list'),
  emptyState: document.getElementById('empty-state'),
  errorState: document.getElementById('error-state'),
  retryBtn: document.getElementById('retry-btn'),
  filterTabs: document.getElementById('filter-tabs'),
  tally: document.getElementById('tally'),
  dateline: document.getElementById('dateline'),
  statusDot: document.getElementById('server-status'),
  statusText: document.getElementById('server-status-text'),

  editDialog: document.getElementById('edit-dialog'),
  editForm: document.getElementById('edit-form'),
  editTitle: document.getElementById('edit-title'),
  editDescription: document.getElementById('edit-description'),
  editError: document.getElementById('edit-form-error'),
  editCancel: document.getElementById('edit-cancel'),
};

let todos = [];
let currentFilter = 'all';
let editingId = null;

function setDateline() {
  const now = new Date();
  els.dateline.textContent = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

async function init() {
  setDateline();
  attachEvents();
  await loadTodos();
}

function attachEvents() {
  els.form.addEventListener('submit', handleCreate);
  els.retryBtn.addEventListener('click', loadTodos);

  els.filterTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    setFilter(btn.dataset.filter);
  });

  els.list.addEventListener('click', handleListClick);

  els.editForm.addEventListener('submit', handleEditSave);
  els.editCancel.addEventListener('click', () => els.editDialog.close());
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch (_) {

    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function loadTodos() {
  setConnectionStatus('checking');
  els.errorState.hidden = true;

  try {
    todos = await apiRequest('');
    setConnectionStatus('ok');
    render();
  } catch (err) {
    setConnectionStatus('down');
    els.list.innerHTML = '';
    els.emptyState.hidden = true;
    els.errorState.hidden = false;
  }
}

function setConnectionStatus(status) {
  els.statusDot.classList.remove('is-ok', 'is-down');
  if (status === 'ok') {
    els.statusDot.classList.add('is-ok');
    els.statusText.textContent = 'Connected';
  } else if (status === 'down') {
    els.statusDot.classList.add('is-down');
    els.statusText.textContent = 'Offline';
  } else {
    els.statusText.textContent = 'Connecting…';
  }
}

async function handleCreate(e) {
  e.preventDefault();
  els.formError.textContent = '';

  const title = els.titleInput.value.trim();
  const description = els.descInput.value.trim();

  if (!title) {
    els.formError.textContent = 'An entry needs a title.';
    return;
  }

  try {
    const created = await apiRequest('', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
    todos.unshift(created);
    els.titleInput.value = '';
    els.descInput.value = '';
    els.titleInput.focus();
    render();
  } catch (err) {
    els.formError.textContent = err.message || 'Could not add the entry.';
  }
}


function handleListClick(e) {
  const item = e.target.closest('.ledger-item');
  if (!item) return;
  const id = Number(item.dataset.id);

  if (e.target.closest('.check')) {
    toggleTodo(id);
  } else if (e.target.closest('.edit-btn')) {
    openEditDialog(id);
  } else if (e.target.closest('.delete-btn')) {
    deleteTodo(id);
  }
}

async function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  const previous = todo.completed;
  todo.completed = !previous;
  render();

  try {
    const updated = await apiRequest(`/${id}/toggle`, { method: 'PATCH' });
    Object.assign(todo, updated);
    render();
  } catch (err) {
    todo.completed = previous;
    render();
  }
}

async function deleteTodo(id) {
  const item = els.list.querySelector(`.ledger-item[data-id="${id}"]`);
  const confirmed = window.confirm('Remove this entry from the ledger?');
  if (!confirmed) return;

  try {
    await apiRequest(`/${id}`, { method: 'DELETE' });
    todos = todos.filter((t) => t.id !== id);
    render();
  } catch (err) {
    if (item) item.classList.add('shake');
  }
}

function openEditDialog(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  editingId = id;
  els.editTitle.value = todo.title;
  els.editDescription.value = todo.description || '';
  els.editError.textContent = '';
  els.editDialog.showModal();
  els.editTitle.focus();
}

async function handleEditSave(e) {
  e.preventDefault();
  const title = els.editTitle.value.trim();
  const description = els.editDescription.value.trim();

  if (!title) {
    els.editError.textContent = 'An entry needs a title.';
    return;
  }

  try {
    const updated = await apiRequest(`/${editingId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description }),
    });
    const todo = todos.find((t) => t.id === editingId);
    Object.assign(todo, updated);
    els.editDialog.close();
    render();
  } catch (err) {
    els.editError.textContent = err.message || 'Could not save changes.';
  }
}

function setFilter(filter) {
  currentFilter = filter;
  [...els.filterTabs.children].forEach((btn) => {
    const active = btn.dataset.filter === filter;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  render();
}

function getVisibleTodos() {
  if (currentFilter === 'open') return todos.filter((t) => !t.completed);
  if (currentFilter === 'done') return todos.filter((t) => t.completed);
  return todos;
}

function render() {
  const visible = getVisibleTodos();
  const openCount = todos.filter((t) => !t.completed).length;
  els.tally.textContent = `${openCount} open · ${todos.length} total`;

  els.list.innerHTML = '';

  if (visible.length === 0) {
    els.emptyState.hidden = false;
    els.emptyState.querySelector('.empty-text').textContent =
      currentFilter === 'done'
        ? 'Nothing finished yet.'
        : currentFilter === 'open'
        ? 'Everything is checked off. Nicely done.'
        : 'Nothing here yet. The page is waiting for its first line.';
    return;
  }

  els.emptyState.hidden = true;

  const fragment = document.createDocumentFragment();
  visible.forEach((todo) => fragment.appendChild(renderItem(todo)));
  els.list.appendChild(fragment);
}

function renderItem(todo) {
  const li = document.createElement('li');
  li.className = `ledger-item${todo.completed ? ' is-done' : ''}`;
  li.dataset.id = todo.id;

  const created = new Date(todo.createdAt);
  const dateLabel = created.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  li.innerHTML = `
    <button class="check" aria-label="${todo.completed ? 'Mark as open' : 'Mark as done'}" aria-pressed="${todo.completed}">
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 8.5L6.2 11.7L13 4.3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="item-body">
      <span class="item-title-row">
        <span class="item-title">${escapeHtml(todo.title)}</span>
        <span class="strike"></span>
      </span>
      ${todo.description ? `<p class="item-desc">${escapeHtml(todo.description)}</p>` : ''}
      <p class="item-meta">added ${dateLabel}</p>
    </div>
    <div class="item-actions">
      <button class="icon-btn edit-btn" aria-label="Edit entry" title="Edit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      </button>
      <button class="icon-btn delete-btn danger" aria-label="Delete entry" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  `;

  return li;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();