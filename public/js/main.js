/**
 * CodeAlpha TaskFlow - Frontend Interactivity & Drag and Drop Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initKanbanDragAndDrop();
  initModalListeners();
});

/* ==========================================================================
   Kanban Drag and Drop Engine
   ========================================================================== */
function initKanbanDragAndDrop() {
  const cards = document.querySelectorAll('.task-card');
  const columns = document.querySelectorAll('.kanban-column');

  if (!cards.length || !columns.length) return;

  let draggedCard = null;

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.dataset.taskId);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedCard = null;
    });
  });

  columns.forEach(column => {
    const columnContent = column.querySelector('.kanban-column-content');
    const status = column.dataset.status;

    columnContent.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      columnContent.classList.add('drag-over');
    });

    columnContent.addEventListener('dragenter', (e) => {
      e.preventDefault();
      columnContent.classList.add('drag-over');
    });

    columnContent.addEventListener('dragleave', (e) => {
      // Only remove if leaving column content container
      if (!columnContent.contains(e.relatedTarget)) {
        columnContent.classList.remove('drag-over');
      }
    });

    columnContent.addEventListener('drop', async (e) => {
      e.preventDefault();
      columnContent.classList.remove('drag-over');

      const taskId = e.dataTransfer.getData('text/plain') || (draggedCard ? draggedCard.dataset.taskId : null);
      if (!taskId) return;

      const cardElement = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
      if (!cardElement) return;

      // Remove empty column placeholder if present
      const placeholder = columnContent.querySelector('.empty-column-placeholder');
      if (placeholder) {
        placeholder.style.display = 'none';
      }

      // Move element visually
      columnContent.appendChild(cardElement);

      // Update counters
      updateColumnTaskCounters();

      // Send AJAX request to backend
      try {
        const response = await fetch(`/tasks/${taskId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ status })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          console.error('Failed to update task status:', data.error);
          showToast('Failed to save status change to server.', 'error');
        } else {
          showToast(`Task #${taskId} moved to ${formatStatus(status)}`, 'success');
        }
      } catch (err) {
        console.error('Network error during status update:', err);
        showToast('Network error while updating task.', 'error');
      }
    });
  });
}

function updateColumnTaskCounters() {
  ['todo', 'in_progress', 'done'].forEach(status => {
    const col = document.querySelector(`.kanban-column[data-status="${status}"]`);
    if (col) {
      const cardCount = col.querySelectorAll('.task-card').length;
      const countBadge = document.getElementById(`count-${status}`);
      if (countBadge) {
        countBadge.textContent = cardCount;
      }

      // Show/hide empty placeholder
      const content = col.querySelector('.kanban-column-content');
      let placeholder = content.querySelector('.empty-column-placeholder');
      if (cardCount === 0) {
        if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.className = 'empty-column-placeholder';
          placeholder.textContent = 'Drop tasks here';
          content.appendChild(placeholder);
        }
        placeholder.style.display = 'block';
      } else if (placeholder) {
        placeholder.style.display = 'none';
      }
    }
  });
}

function formatStatus(status) {
  switch (status) {
    case 'todo': return 'To Do';
    case 'in_progress': return 'In Progress';
    case 'done': return 'Done';
    default: return status;
  }
}

/* ==========================================================================
   Modal Dialog Management
   ========================================================================== */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
  }
}

function initModalListeners() {
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('open');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    }
  });
}

/* ==========================================================================
   Toast Notification Helper
   ========================================================================== */
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
  toast.style.cssText = `
    margin: 0;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease-out;
  `;
  toast.innerHTML = `<span>${message}</span>`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
