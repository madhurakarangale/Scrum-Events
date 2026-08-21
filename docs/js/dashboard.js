// ============================================================
// SCRUMFLOW PRO · DASHBOARD MODULE
// ============================================================

(function() {
  'use strict';

  // Dynamic API Base URL resolution
  function getApiUrl() {
    const custom = localStorage.getItem('scrumflow_custom_api_url');
    if (custom) return custom.replace(/\/+$/, '');

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.port === '5000' ? '/api' : 'http://localhost:5000/api';
    }
    return window.SCRUMFLOW_API_URL || 'https://scrumflow-backend.vercel.app/api';
  }

  let API_URL = getApiUrl();
  let isApiConnected = false;

  // ===== CHECK AUTH =====
  const token = localStorage.getItem('scrumflow_token');
  const userData = JSON.parse(localStorage.getItem('scrumflow_user') || '{}');

  if (!token) {
    window.location.href = '../index.html';
    return;
  }

  // ===== STATE =====
  let stories = [];
  let nextId = 1;
  let historyEvents = [];

  // User specific storage key
  const userIdentifier = (userData.email || userData.id || 'default').toString().toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  const STORAGE_KEY = 'scrumflow_user_data_' + userIdentifier;

  // ===== DOM REFS =====
  const storyListEl = document.getElementById('storyListContainer');
  const todoListEl = document.getElementById('todoList');
  const inprogressListEl = document.getElementById('inprogressList');
  const doneListEl = document.getElementById('doneList');
  const todoCountEl = document.getElementById('todoCount');
  const inprogressCountEl = document.getElementById('inprogressCount');
  const doneCountEl = document.getElementById('doneCount');
  const velocityDisplay = document.getElementById('velocityDisplay');
  const velocityValue = document.getElementById('velocityValue');
  const historyListEl = document.getElementById('historyList');
  const storyCountEl = document.getElementById('storyCount');
  const totalTasksEl = document.getElementById('totalTasksCount');
  const userNameEl = document.getElementById('userName');
  const logoutBtn = document.getElementById('logoutBtn');
  const syncStatusPill = document.getElementById('syncStatusPill');
  const dashStatusDot = document.getElementById('dashStatusDot');
  const dashStatusText = document.getElementById('dashStatusText');

  const addBtn = document.getElementById('addStoryBtn');
  const titleInput = document.getElementById('storyTitleInput');
  const pointsSelect = document.getElementById('storyPointsSelect');
  const resetBtn = document.getElementById('resetAllBtn');
  const exportBtn = document.getElementById('exportJsonBtn');
  const importBtn = document.getElementById('importJsonBtn');
  const fileInput = document.getElementById('fileInput');

  // ===== SET USER NAME =====
  if (userNameEl) {
    userNameEl.textContent = userData.name || 'Agile Master';
  }

  // ===== SYNC / STATUS PILL CLICK =====
  if (syncStatusPill) {
    syncStatusPill.addEventListener('click', () => {
      const current = localStorage.getItem('scrumflow_custom_api_url') || API_URL;
      const mode = isApiConnected ? 'Connected to PostgreSQL Backend' : 'Running in Offline / LocalStorage Mode';
      const promptVal = prompt(
        `Current Status: ${mode}\nAPI Base URL: ${API_URL}\n\nTo connect to a custom backend, enter the URL below (or leave blank to reset):`,
        current
      );
      if (promptVal !== null) {
        const trimmed = promptVal.trim();
        if (trimmed) {
          localStorage.setItem('scrumflow_custom_api_url', trimmed);
        } else {
          localStorage.removeItem('scrumflow_custom_api_url');
        }
        API_URL = getApiUrl();
        init();
      }
    });
  }

  // ===== LOGOUT =====
  logoutBtn.addEventListener('click', function() {
    localStorage.removeItem('scrumflow_token');
    localStorage.removeItem('scrumflow_user');
    window.location.href = '../index.html';
  });

  // ===== HELPERS =====
  function getStatusCounts() {
    const todo = stories.filter(s => s.status === 'todo').length;
    const inprogress = stories.filter(s => s.status === 'inprogress').length;
    const done = stories.filter(s => s.status === 'done').length;
    return { todo, inprogress, done };
  }

  function calculateVelocity() {
    return stories.filter(s => s.status === 'done').reduce((sum, s) => sum + (Number(s.points) || 0), 0);
  }

  function addHistoryEvent(action, details) {
    historyEvents.unshift({
      action,
      details,
      timestamp: new Date().toLocaleTimeString(),
      full: new Date().toISOString()
    });
    if (historyEvents.length > 50) historyEvents.pop();
    renderHistory();
    saveData();
  }

  function renderHistory() {
    if (historyEvents.length === 0) {
      historyListEl.innerHTML = `<div class="history-item" style="opacity:0.6;"><span>No activity yet — start adding stories!</span></div>`;
      return;
    }
    let html = '';
    historyEvents.slice(0, 25).forEach(ev => {
      html += `<div class="history-item"><span>${escapeHtml(ev.action)}: ${escapeHtml(ev.details)}</span><span class="time">${ev.timestamp}</span></div>`;
    });
    historyListEl.innerHTML = html;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== SAMPLE DATA FILTER (Ensures zero mock data ever appears) =====
  const SAMPLE_TITLES = new Set([
    'user authentication & jwt authorization',
    'interactive agile kanban task board',
    'automatic sprint velocity calculation',
    'activity log & real-time event audit',
    'export / import sprint data as json',
    'postgresql database synchronization'
  ]);

  function sanitizeUserData(rawStories, rawHistory) {
    const cleanStories = (rawStories || []).filter(s => {
      const titleLower = (s.title || '').toLowerCase().trim();
      return !SAMPLE_TITLES.has(titleLower);
    });

    const cleanHistory = (rawHistory || []).filter(h => {
      if (h.action === 'Seed') return false;
      if (h.details && h.details.includes('Loaded initial sprint template')) return false;
      return true;
    });

    return { stories: cleanStories, history: cleanHistory };
  }

  // ===== LOCAL STORAGE DATA PERSISTENCE =====
  function saveToLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stories,
        history: historyEvents,
        nextId
      }));
    } catch (e) {
      console.warn('Local storage save error:', e);
    }
  }

  function loadFromLocal() {
    try {
      // Try user specific key first, fallback to legacy key if needed
      let dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr && userData.id) {
        dataStr = localStorage.getItem('scrumflow_data_' + userData.id);
      }

      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        const sanitized = sanitizeUserData(parsed.stories, parsed.history);

        stories = sanitized.stories;
        historyEvents = sanitized.history;
        nextId = parsed.nextId || (stories.length > 0 ? Math.max(...stories.map(s => s.id)) + 1 : 1);
        saveToLocal();
        return true;
      }
    } catch (e) {
      console.warn('Local storage load error:', e);
    }
    return false;
  }

  // ===== BACKEND API CALLS =====
  async function loadFromBackend() {
    // If token is local demo token, skip remote API load
    if (token.startsWith('demo-local-') || token.startsWith('local-token-')) {
      updateSyncStatus(false, 'Local Storage');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(`${API_URL}/stories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const sanitized = sanitizeUserData(data.stories, data.history);
        stories = sanitized.stories;
        historyEvents = sanitized.history;
        nextId = data.nextId || (stories.length > 0 ? Math.max(...stories.map(s => s.id)) + 1 : 1);
        isApiConnected = true;
        updateSyncStatus(true, 'Live Database');
        saveToLocal();
        renderAll();
        return true;
      }
    } catch (error) {
      console.warn('Backend load failed, falling back to local:', error.message);
    }
    updateSyncStatus(false, 'Local Storage');
    return false;
  }

  async function saveData() {
    saveToLocal();

    if (token.startsWith('demo-local-') || token.startsWith('local-token-')) {
      return;
    }

    try {
      const data = {
        stories: stories,
        history: historyEvents,
        nextId: nextId
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${API_URL}/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        isApiConnected = true;
        updateSyncStatus(true, 'Live Database');
      }
    } catch (error) {
      console.warn('Backend save unavailable, saved locally:', error.message);
      updateSyncStatus(false, 'Local Storage');
    }
  }

  function updateSyncStatus(connected, label) {
    isApiConnected = connected;
    if (dashStatusDot && dashStatusText) {
      dashStatusDot.className = 'status-dot ' + (connected ? 'online' : 'offline');
      dashStatusText.textContent = label;
    }
  }

  // ===== RENDER FUNCTIONS =====
  function renderAll() {
    renderStoryList();
    renderTaskBoard();
    updateVelocity();
    updateCounts();
    renderHistory();
  }

  function renderStoryList() {
    if (stories.length === 0) {
      storyListEl.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i>No stories yet — add one above.</div>`;
      return;
    }
    let html = '';
    stories.forEach(story => {
      const statusClass = story.status === 'todo' ? 'todo' : (story.status === 'inprogress' ? 'inprogress' : 'done');
      const statusLabel = story.status === 'todo' ? 'To do' : (story.status === 'inprogress' ? 'In progress' : 'Done');
      html += `
        <div class="story-item" data-id="${story.id}">
          <div class="story-info">
            <span class="story-title">${escapeHtml(story.title)}</span>
            <span class="story-points"><i class="fas fa-weight-hanging" style="font-size:0.6rem;"></i> ${story.points}</span>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </div>
          <div class="story-actions">
            <button class="delete-btn" data-id="${story.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      `;
    });
    storyListEl.innerHTML = html;

    document.querySelectorAll('.story-item .delete-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = parseInt(this.dataset.id, 10);
        deleteStory(id);
      });
    });
  }

  function renderTaskBoard() {
    todoListEl.innerHTML = '';
    inprogressListEl.innerHTML = '';
    doneListEl.innerHTML = '';

    const todoItems = stories.filter(s => s.status === 'todo');
    const inprogressItems = stories.filter(s => s.status === 'inprogress');
    const doneItems = stories.filter(s => s.status === 'done');

    function createTaskHTML(story) {
      return `
        <div class="task-item" data-id="${story.id}">
          <span class="task-title">${escapeHtml(story.title)}</span>
          <span class="task-point">${story.points}</span>
          <div class="task-actions">
            ${story.status !== 'todo' ? `<button class="move-left" data-id="${story.id}" title="Move left"><i class="fas fa-chevron-left"></i></button>` : ''}
            ${story.status !== 'done' ? `<button class="move-right" data-id="${story.id}" title="Move right"><i class="fas fa-chevron-right"></i></button>` : ''}
          </div>
        </div>
      `;
    }

    todoItems.forEach(s => { todoListEl.innerHTML += createTaskHTML(s); });
    inprogressItems.forEach(s => { inprogressListEl.innerHTML += createTaskHTML(s); });
    doneItems.forEach(s => { doneListEl.innerHTML += createTaskHTML(s); });

    const counts = getStatusCounts();
    todoCountEl.textContent = counts.todo;
    inprogressCountEl.textContent = counts.inprogress;
    doneCountEl.textContent = counts.done;

    document.querySelectorAll('.move-right').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = parseInt(this.dataset.id, 10);
        moveStory(id, 1);
      });
    });
    document.querySelectorAll('.move-left').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = parseInt(this.dataset.id, 10);
        moveStory(id, -1);
      });
    });

    if (todoItems.length === 0) todoListEl.innerHTML = `<div class="empty-state" style="padding:0.8rem 0; font-size:0.75rem;">No tasks</div>`;
    if (inprogressItems.length === 0) inprogressListEl.innerHTML = `<div class="empty-state" style="padding:0.8rem 0; font-size:0.75rem;">No tasks</div>`;
    if (doneItems.length === 0) doneListEl.innerHTML = `<div class="empty-state" style="padding:0.8rem 0; font-size:0.75rem;">No tasks</div>`;
  }

  function updateVelocity() {
    const vel = calculateVelocity();
    velocityDisplay.textContent = vel;
    velocityValue.textContent = vel;
  }

  function updateCounts() {
    storyCountEl.textContent = stories.length;
    totalTasksEl.textContent = stories.length;
  }

  // ===== CRUD OPERATIONS =====
  function moveStory(id, delta) {
    const story = stories.find(s => s.id === id);
    if (!story) return;
    const statuses = ['todo', 'inprogress', 'done'];
    const idx = statuses.indexOf(story.status);
    const newIdx = Math.min(Math.max(idx + delta, 0), statuses.length - 1);
    if (newIdx === idx) return;
    const oldStatus = story.status;
    story.status = statuses[newIdx];
    addHistoryEvent('Move', `"${story.title}" ${oldStatus} → ${story.status}`);
    renderAll();
  }

  function deleteStory(id) {
    const story = stories.find(s => s.id === id);
    if (!story) return;
    addHistoryEvent('Delete', `"${story.title}" (${story.points} pts)`);
    stories = stories.filter(s => s.id !== id);
    renderAll();
    saveData();
  }

  function addStory(title, points) {
    if (!title.trim()) {
      alert('Please enter a story title.');
      return;
    }
    const newStory = {
      id: nextId++,
      title: title.trim(),
      points: parseInt(points, 10) || 1,
      status: 'todo'
    };
    stories.push(newStory);
    addHistoryEvent('Create', `"${newStory.title}" (${newStory.points} pts)`);
    renderAll();
    titleInput.value = '';
    pointsSelect.value = '2';
    titleInput.focus();
  }

  function resetAll() {
    if (stories.length === 0) return;
    if (confirm('⚠️ Reset all stories and tasks? This cannot be undone.')) {
      addHistoryEvent('Reset', `Cleared ${stories.length} items`);
      stories = [];
      nextId = 1;
      renderAll();
      saveData();
    }
  }

  // ===== EXPORT / IMPORT =====
  function exportJson() {
    if (stories.length === 0) {
      alert('No stories to export.');
      return;
    }
    const data = {
      exportedAt: new Date().toISOString(),
      stories: stories,
      velocity: calculateVelocity(),
      history: historyEvents.slice(0, 20)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrumflow-export-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addHistoryEvent('Export', `Exported ${stories.length} stories`);
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.stories || !Array.isArray(data.stories)) {
          alert('Invalid file format. Please export a valid ScrumFlow JSON file.');
          return;
        }
        
        if (stories.length > 0) {
          if (!confirm('This will replace all current stories. Continue?')) {
            return;
          }
        }
        
        stories = data.stories;
        let maxId = 0;
        stories.forEach(s => { if (s.id > maxId) maxId = s.id; });
        nextId = maxId + 1;
        
        if (data.history) {
          historyEvents = data.history;
        }
        
        renderAll();
        saveData();
        addHistoryEvent('Import', `Imported ${stories.length} stories from file`);
        alert(`✅ Successfully imported ${stories.length} stories!`);
      } catch (err) {
        alert('❌ Error importing file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ===== EVENT LISTENERS =====
  addBtn.addEventListener('click', () => addStory(titleInput.value, pointsSelect.value));

  titleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addStory(titleInput.value, pointsSelect.value);
    }
  });

  resetBtn.addEventListener('click', resetAll);
  exportBtn.addEventListener('click', exportJson);
  
  importBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importJson(e.target.files[0]);
      e.target.value = '';
    }
  });

  // ===== KEYBOARD SHORTCUTS =====
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      resetAll();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      exportJson();
    }
  });

  // ===== INITIALIZE =====
  async function init() {
    const loadedFromApi = await loadFromBackend();
    if (!loadedFromApi) {
      loadFromLocal();
      renderAll();
      saveData();
    }
    console.log('🚀 ScrumFlow initialized successfully!');
    console.log(`📊 ${stories.length} stories loaded`);
    console.log(`👤 User: ${userData.name}`);
  }

  init();

})();