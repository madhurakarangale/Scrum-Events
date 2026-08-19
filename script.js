// ============================================================
// SCRUMFLOW PRO · FULLY FUNCTIONAL APPLICATION
// No external dependencies - complete self-contained system
// ============================================================

(function() {
  'use strict';

  // ---------- STATE ----------
  let stories = [];
  let nextId = 1;
  let historyEvents = [];

  // ---------- DOM REFS ----------
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

  const addBtn = document.getElementById('addStoryBtn');
  const titleInput = document.getElementById('storyTitleInput');
  const pointsSelect = document.getElementById('storyPointsSelect');
  const resetBtn = document.getElementById('resetAllBtn');
  const exportBtn = document.getElementById('exportJsonBtn');
  const importBtn = document.getElementById('importJsonBtn');
  const fileInput = document.getElementById('fileInput');

  // ---------- HELPERS ----------
  function getStatusCounts() {
    const todo = stories.filter(s => s.status === 'todo').length;
    const inprogress = stories.filter(s => s.status === 'inprogress').length;
    const done = stories.filter(s => s.status === 'done').length;
    return { todo, inprogress, done };
  }

  function calculateVelocity() {
    return stories.filter(s => s.status === 'done').reduce((sum, s) => sum + s.points, 0);
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
    saveToLocalStorage();
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

  // ---------- LOCAL STORAGE ----------
  function saveToLocalStorage() {
    try {
      const data = {
        stories: stories,
        nextId: nextId,
        historyEvents: historyEvents
      };
      localStorage.setItem('scrumflow_data', JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  function loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('scrumflow_data');
      if (stored) {
        const data = JSON.parse(stored);
        stories = data.stories || [];
        nextId = data.nextId || 1;
        historyEvents = data.historyEvents || [];
        return true;
      }
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
    }
    return false;
  }

  // ---------- RENDER FUNCTIONS ----------
  function renderAll() {
    renderStoryList();
    renderTaskBoard();
    updateVelocity();
    updateCounts();
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
        const id = parseInt(this.dataset.id);
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

    // Move event listeners
    document.querySelectorAll('.move-right').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = parseInt(this.dataset.id);
        moveStory(id, 1);
      });
    });
    document.querySelectorAll('.move-left').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = parseInt(this.dataset.id);
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

  // ---------- CRUD OPERATIONS ----------
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
  }

  function addStory(title, points) {
    if (!title.trim()) {
      alert('Please enter a story title.');
      return;
    }
    const newStory = {
      id: nextId++,
      title: title.trim(),
      points: parseInt(points, 10),
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
      saveToLocalStorage();
    }
  }

  // ---------- EXPORT / IMPORT ----------
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
        // Find the max ID to continue from there
        let maxId = 0;
        stories.forEach(s => { if (s.id > maxId) maxId = s.id; });
        nextId = maxId + 1;
        
        if (data.history) {
          historyEvents = data.history;
        }
        
        renderAll();
        saveToLocalStorage();
        addHistoryEvent('Import', `Imported ${stories.length} stories from file`);
        alert(`✅ Successfully imported ${stories.length} stories!`);
      } catch (err) {
        alert('❌ Error importing file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ---------- SEED DEMO DATA ----------
  // function seedDemo() {
  //   // Check if we have saved data
  //   if (loadFromLocalStorage()) {
  //     renderAll();
  //     return;
  //   }
    
  //   // Otherwise seed with demo data
  //   const demo = [
  //     { title: 'User login with OAuth', points: 5 },
  //     { title: 'Dashboard analytics', points: 8 },
  //     { title: 'Profile picture upload', points: 3 },
  //     { title: 'Password reset flow', points: 2 },
  //     { title: 'Email notification system', points: 5 },
  //   ];
  //   demo.forEach((d, index) => {
  //     const statuses = ['todo', 'inprogress', 'done'];
  //     const status = statuses[index % statuses.length];
  //     stories.push({
  //       id: nextId++,
  //       title: d.title,
  //       points: d.points,
  //       status: status
  //     });
  //   });
  //   renderAll();
  //   addHistoryEvent('Seed', 'Loaded demo stories');
  //   saveToLocalStorage();
  // }

  // ---------- EVENT LISTENERS ----------
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
      e.target.value = ''; // Reset file input
    }
  });

  // ---------- KEYBOARD SHORTCUTS ----------
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+R to reset
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      resetAll();
    }
    // Ctrl+Shift+E to export
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      exportJson();
    }
  });

  // ---------- INITIALIZE ----------
  seedDemo();

  console.log('🚀 ScrumFlow Pro initialized successfully!');
  console.log(`📊 ${stories.length} stories loaded`);
  console.log('💡 Shortcuts: Ctrl+Shift+R = Reset, Ctrl+Shift+E = Export');

})();