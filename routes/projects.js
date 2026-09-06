const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// GET /dashboard
router.get('/dashboard', requireAuth, (req, res) => {
  const userId = req.session.user.id;

  try {
    // Fetch projects user owns or belongs to
    const projects = db.prepare(`
      SELECT DISTINCT p.*, u.username as owner_name
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.owner_id = ? OR pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId, userId);

    // Attach additional info to each project (task statistics and member avatars)
    const enrichedProjects = projects.map(project => {
      const taskStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
        FROM tasks 
        WHERE project_id = ?
      `).get(project.id);

      const members = db.prepare(`
        SELECT u.id, u.username, u.email, u.avatar_color, pm.role
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
      `).all(project.id);

      return {
        ...project,
        totalTasks: taskStats.total || 0,
        completedTasks: taskStats.completed || 0,
        members
      };
    });

    // Global dashboard stats for the current user
    const userTaskStats = db.prepare(`
      SELECT 
        COUNT(*) as totalAssigned,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as totalDone,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as totalInProgress
      FROM tasks
      WHERE assignee_id = ?
    `).get(userId);

    res.render('dashboard', {
      projects: enrichedProjects,
      stats: {
        totalProjects: enrichedProjects.length,
        totalAssigned: userTaskStats.totalAssigned || 0,
        totalInProgress: userTaskStats.totalInProgress || 0,
        totalDone: userTaskStats.totalDone || 0
      },
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.status(500).send('Internal Server Error');
  }
});

// POST /projects - Create Project
router.post('/projects', requireAuth, (req, res) => {
  const { name, description } = req.body;
  const userId = req.session.user.id;

  if (!name || !name.trim()) {
    return res.redirect('/dashboard?error=Project name is required.');
  }

  try {
    const insertProject = db.prepare(`
      INSERT INTO projects (name, description, owner_id)
      VALUES (?, ?, ?)
    `);
    const result = insertProject.run(name.trim(), description ? description.trim() : '', userId);
    const projectId = result.lastInsertRowid;

    // Add owner as a project member
    db.prepare(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (?, ?, 'owner')
    `).run(projectId, userId);

    res.redirect(`/projects/${projectId}`);
  } catch (err) {
    console.error('Error creating project:', err);
    res.redirect('/dashboard?error=Failed to create project.');
  }
});

// GET /projects/:id - Kanban Board View
router.get('/projects/:id', requireAuth, (req, res) => {
  const projectId = req.params.id;
  const userId = req.session.user.id;

  try {
    // Check if project exists
    const project = db.prepare(`
      SELECT p.*, u.username as owner_name, u.avatar_color as owner_color
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `).get(projectId);

    if (!project) {
      return res.status(404).render('404', { message: 'Project not found' });
    }

    // Check membership
    const membership = db.prepare(`
      SELECT * FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, userId);

    if (!membership && project.owner_id !== userId) {
      return res.status(403).redirect('/dashboard?error=You are not a member of this project.');
    }

    // Get all project members
    const members = db.prepare(`
      SELECT u.id, u.username, u.email, u.avatar_color, pm.role
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY u.username ASC
    `).all(projectId);

    // Get all non-member users (to add to project)
    const availableUsers = db.prepare(`
      SELECT id, username, email FROM users
      WHERE id NOT IN (SELECT user_id FROM project_members WHERE project_id = ?)
      ORDER BY username ASC
    `).all(projectId);

    // Get all tasks for this project
    const tasks = db.prepare(`
      SELECT t.*, 
             u.username as assignee_name, 
             u.avatar_color as assignee_color,
             c.username as creator_name,
             (SELECT COUNT(*) FROM comments cm WHERE cm.task_id = t.id) as comment_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      JOIN users c ON t.creator_id = c.id
      WHERE t.project_id = ?
      ORDER BY t.created_at DESC
    `).all(projectId);

    // Group tasks into columns
    const columns = {
      todo: tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      done: tasks.filter(t => t.status === 'done')
    };

    res.render('project', {
      project,
      members,
      availableUsers,
      columns,
      totalTasksCount: tasks.length,
      isOwner: project.owner_id === userId,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).send('Internal Server Error');
  }
});

// POST /projects/:id/members - Add user to project
router.post('/projects/:id/members', requireAuth, (req, res) => {
  const projectId = req.params.id;
  const { userId: memberUserId, usernameOrEmail } = req.body;
  const currentUserId = req.session.user.id;

  try {
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.redirect('/dashboard?error=Project not found.');
    }

    let targetUser = null;

    if (memberUserId) {
      targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(memberUserId);
    } else if (usernameOrEmail) {
      targetUser = db.prepare('SELECT id, username FROM users WHERE username = ? OR email = ?')
        .get(usernameOrEmail.trim(), usernameOrEmail.trim().toLowerCase());
    }

    if (!targetUser) {
      return res.redirect(`/projects/${projectId}?error=User not found.`);
    }

    // Check if already a member
    const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?')
      .get(projectId, targetUser.id);

    if (existing) {
      return res.redirect(`/projects/${projectId}?error=User is already a project member.`);
    }

    db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'member')")
      .run(projectId, targetUser.id);

    res.redirect(`/projects/${projectId}?success=Added @${targetUser.username} to project.`);
  } catch (err) {
    console.error('Error adding member:', err);
    res.redirect(`/projects/${projectId}?error=Failed to add project member.`);
  }
});

// POST /projects/:id/delete - Delete project (owner only)
router.post('/projects/:id/delete', requireAuth, (req, res) => {
  const projectId = req.params.id;
  const userId = req.session.user.id;

  try {
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.redirect('/dashboard?error=Project not found.');
    }

    if (project.owner_id !== userId) {
      return res.redirect(`/projects/${projectId}?error=Only the project owner can delete this project.`);
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    res.redirect('/dashboard?success=Project deleted successfully.');
  } catch (err) {
    console.error('Error deleting project:', err);
    res.redirect('/dashboard?error=Failed to delete project.');
  }
});

module.exports = router;
