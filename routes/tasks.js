const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// POST /projects/:projectId/tasks - Create Task
router.post('/projects/:projectId/tasks', requireAuth, (req, res) => {
  const projectId = req.params.projectId;
  const { title, description, status, priority, assignee_id, due_date } = req.body;
  const creatorId = req.session.user.id;

  if (!title || !title.trim()) {
    return res.redirect(`/projects/${projectId}?error=Task title is required.`);
  }

  try {
    const validStatus = ['todo', 'in_progress', 'done'].includes(status) ? status : 'todo';
    const validPriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
    const parsedAssignee = assignee_id ? parseInt(assignee_id, 10) : null;

    db.prepare(`
      INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, creator_id, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      title.trim(),
      description ? description.trim() : '',
      validStatus,
      validPriority,
      parsedAssignee,
      creatorId,
      due_date || null
    );

    res.redirect(`/projects/${projectId}`);
  } catch (err) {
    console.error('Error creating task:', err);
    res.redirect(`/projects/${projectId}?error=Failed to create task.`);
  }
});

// GET /tasks/:id - View Task Detail & Comments
router.get('/tasks/:id', requireAuth, (req, res) => {
  const taskId = req.params.id;
  const userId = req.session.user.id;

  try {
    const task = db.prepare(`
      SELECT t.*, 
             p.name as project_name,
             u.username as assignee_name, 
             u.avatar_color as assignee_color,
             c.username as creator_name,
             c.avatar_color as creator_color
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      JOIN users c ON t.creator_id = c.id
      WHERE t.id = ?
    `).get(taskId);

    if (!task) {
      return res.status(404).render('404', { message: 'Task not found' });
    }

    // Verify user membership in project
    const isMember = db.prepare(`
      SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(task.project_id, userId);

    const isProjectOwner = db.prepare(`
      SELECT 1 FROM projects WHERE id = ? AND owner_id = ?
    `).get(task.project_id, userId);

    if (!isMember && !isProjectOwner) {
      return res.status(403).redirect('/dashboard?error=Access denied.');
    }

    // Get project members for reassignment dropdown
    const projectMembers = db.prepare(`
      SELECT u.id, u.username, u.email, u.avatar_color
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY u.username ASC
    `).all(task.project_id);

    // Get comments
    const comments = db.prepare(`
      SELECT cm.*, u.username as author_name, u.avatar_color as author_color
      FROM comments cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.task_id = ?
      ORDER BY cm.created_at ASC
    `).all(taskId);

    res.render('task', {
      task,
      projectMembers,
      comments,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error('Error loading task detail:', err);
    res.status(500).send('Internal Server Error');
  }
});

// POST /tasks/:id/update - Update Task details
router.post('/tasks/:id/update', requireAuth, (req, res) => {
  const taskId = req.params.id;
  const { title, description, status, priority, assignee_id, due_date } = req.body;

  try {
    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.redirect('/dashboard?error=Task not found.');
    }

    const validStatus = ['todo', 'in_progress', 'done'].includes(status) ? status : 'todo';
    const validPriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
    const parsedAssignee = assignee_id ? parseInt(assignee_id, 10) : null;

    db.prepare(`
      UPDATE tasks 
      SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title.trim(),
      description ? description.trim() : '',
      validStatus,
      validPriority,
      parsedAssignee,
      due_date || null,
      taskId
    );

    res.redirect(`/tasks/${taskId}?success=Task updated successfully.`);
  } catch (err) {
    console.error('Error updating task:', err);
    res.redirect(`/tasks/${taskId}?error=Failed to update task.`);
  }
});

// PATCH /tasks/:id/status (or POST /tasks/:id/status for drag-and-drop AJAX)
const handleStatusUpdate = (req, res) => {
  const taskId = req.params.id;
  const { status } = req.body;

  if (!['todo', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    const result = db.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, taskId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ success: true, taskId: parseInt(taskId, 10), status });
  } catch (err) {
    console.error('Error updating task status:', err);
    res.status(500).json({ error: 'Server error updating task status.' });
  }
};

router.patch('/tasks/:id/status', requireAuth, handleStatusUpdate);
router.post('/tasks/:id/status', requireAuth, handleStatusUpdate);

// POST /tasks/:id/delete - Delete Task
router.post('/tasks/:id/delete', requireAuth, (req, res) => {
  const taskId = req.params.id;

  try {
    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.redirect('/dashboard?error=Task not found.');
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

    res.redirect(`/projects/${task.project_id}?success=Task deleted.`);
  } catch (err) {
    console.error('Error deleting task:', err);
    res.redirect(`/tasks/${taskId}?error=Failed to delete task.`);
  }
});

module.exports = router;
