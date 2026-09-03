const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// POST /tasks/:id/comments - Add Comment to Task
router.post('/tasks/:id/comments', requireAuth, (req, res) => {
  const taskId = req.params.id;
  const { content } = req.body;
  const userId = req.session.user.id;

  if (!content || !content.trim()) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }
    return res.redirect(`/tasks/${taskId}?error=Comment content cannot be empty.`);
  }

  try {
    const task = db.prepare('SELECT id, project_id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(404).json({ error: 'Task not found.' });
      }
      return res.redirect('/dashboard?error=Task not found.');
    }

    const result = db.prepare(`
      INSERT INTO comments (task_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(taskId, userId, content.trim());

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      const comment = db.prepare(`
        SELECT cm.*, u.username as author_name, u.avatar_color as author_color
        FROM comments cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.id = ?
      `).get(result.lastInsertRowid);
      return res.json({ success: true, comment });
    }

    res.redirect(`/tasks/${taskId}#comments`);
  } catch (err) {
    console.error('Error adding comment:', err);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: 'Failed to add comment.' });
    }
    res.redirect(`/tasks/${taskId}?error=Failed to add comment.`);
  }
});

// POST /comments/:id/delete - Delete Comment
router.post('/comments/:id/delete', requireAuth, (req, res) => {
  const commentId = req.params.id;
  const userId = req.session.user.id;

  try {
    const comment = db.prepare(`
      SELECT cm.*, t.project_id, p.owner_id as project_owner_id
      FROM comments cm
      JOIN tasks t ON cm.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE cm.id = ?
    `).get(commentId);

    if (!comment) {
      return res.redirect('/dashboard?error=Comment not found.');
    }

    // Only comment author or project owner can delete comment
    if (comment.user_id !== userId && comment.project_owner_id !== userId) {
      return res.redirect(`/tasks/${comment.task_id}?error=Permission denied to delete comment.`);
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);

    res.redirect(`/tasks/${comment.task_id}?success=Comment deleted.`);
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.redirect('/dashboard?error=Failed to delete comment.');
  }
});

module.exports = router;
