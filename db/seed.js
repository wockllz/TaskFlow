const db = require('./database');
const bcrypt = require('bcryptjs');

function seedDatabase() {
  console.log('Seeding database...');

  // Check if users already exist
  const existingUsersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (existingUsersCount > 0) {
    console.log('Database already contains data. Clearing existing tables for fresh seed...');
    db.prepare('DELETE FROM comments').run();
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM project_members').run();
    db.prepare('DELETE FROM projects').run();
    db.prepare('DELETE FROM users').run();
  }

  const hashedPassword = bcrypt.hashSync('password123', 10);

  // Insert sample users
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password, avatar_color)
    VALUES (?, ?, ?, ?)
  `);

  const sarahId = insertUser.run('sarah_pm', 'sarah@codealpha.com', hashedPassword, '#ec4899').lastInsertRowid;
  const alexId = insertUser.run('alex_dev', 'alex@codealpha.com', hashedPassword, '#3b82f6').lastInsertRowid;
  const johnId = insertUser.run('john_design', 'john@codealpha.com', hashedPassword, '#10b981').lastInsertRowid;
  const emmaId = insertUser.run('emma_qa', 'emma@codealpha.com', hashedPassword, '#f59e0b').lastInsertRowid;

  console.log('Users created:', { sarahId, alexId, johnId, emmaId });

  // Insert sample projects
  const insertProject = db.prepare(`
    INSERT INTO projects (name, description, owner_id)
    VALUES (?, ?, ?)
  `);

  const p1Id = insertProject.run(
    'CodeAlpha Web Portal Redesign',
    'Full overhaul of the intern portal dashboard, task management workflow, and user settings.',
    sarahId
  ).lastInsertRowid;

  const p2Id = insertProject.run(
    'Mobile Application MVP',
    'Cross-platform mobile client for push notifications, status updates, and task tracking on the go.',
    alexId
  ).lastInsertRowid;

  console.log('Projects created:', { p1Id, p2Id });

  // Insert project members
  const insertMember = db.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, ?)
  `);

  // Project 1 members
  insertMember.run(p1Id, sarahId, 'owner');
  insertMember.run(p1Id, alexId, 'member');
  insertMember.run(p1Id, johnId, 'member');
  insertMember.run(p1Id, emmaId, 'member');

  // Project 2 members
  insertMember.run(p2Id, alexId, 'owner');
  insertMember.run(p2Id, sarahId, 'member');
  insertMember.run(p2Id, johnId, 'member');

  // Insert tasks for Project 1
  const insertTask = db.prepare(`
    INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, creator_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const t1Id = insertTask.run(
    p1Id,
    'Setup Express & SQLite Database Architecture',
    'Define relational schemas for users, projects, tasks, and comments with proper foreign key cascades.',
    'done',
    'high',
    alexId,
    sarahId,
    '2026-09-10'
  ).lastInsertRowid;

  const t2Id = insertTask.run(
    p1Id,
    'Design Responsive Kanban Board UI',
    'Create modern, clean EJS components and CSS layouts for board columns, task cards, and member badges.',
    'done',
    'medium',
    johnId,
    sarahId,
    '2026-09-12'
  ).lastInsertRowid;

  const t3Id = insertTask.run(
    p1Id,
    'Implement Drag and Drop Card Movement',
    'Add HTML5 drag-and-drop JavaScript handlers with seamless AJAX PATCH updates to synchronize column status.',
    'in_progress',
    'high',
    alexId,
    sarahId,
    '2026-09-15'
  ).lastInsertRowid;

  const t4Id = insertTask.run(
    p1Id,
    'User Authentication & Session Management',
    'Implement secure user registration, password hashing using bcryptjs, and session handling middleware.',
    'in_progress',
    'high',
    sarahId,
    sarahId,
    '2026-09-14'
  ).lastInsertRowid;

  const t5Id = insertTask.run(
    p1Id,
    'Task Detail View & Discussion Threads',
    'Build dedicated task view with commenting capability for real-time team communication.',
    'todo',
    'medium',
    emmaId,
    sarahId,
    '2026-09-18'
  ).lastInsertRowid;

  const t6Id = insertTask.run(
    p1Id,
    'Final Documentation & CodeAlpha Submission',
    'Write comprehensive README.md detailing setup instructions, tech stack, and feature overview.',
    'todo',
    'low',
    sarahId,
    sarahId,
    '2026-09-20'
  ).lastInsertRowid;

  // Insert tasks for Project 2
  const t7Id = insertTask.run(
    p2Id,
    'Mobile Flutter App Boilerplate',
    'Initialize Flutter project structure with state management and API service wrappers.',
    'done',
    'high',
    alexId,
    alexId,
    '2026-09-08'
  ).lastInsertRowid;

  const t8Id = insertTask.run(
    p2Id,
    'RESTful API Endpoint Documentation',
    'Document endpoints for authentication, task updates, and real-time polling.',
    'in_progress',
    'medium',
    sarahId,
    alexId,
    '2026-09-16'
  ).lastInsertRowid;

  const t9Id = insertTask.run(
    p2Id,
    'Push Notification Trigger System',
    'Configure Firebase Cloud Messaging to send alerts on task assignments and comments.',
    'todo',
    'low',
    johnId,
    alexId,
    '2026-09-22'
  ).lastInsertRowid;

  // Insert comments
  const insertComment = db.prepare(`
    INSERT INTO comments (task_id, user_id, content)
    VALUES (?, ?, ?)
  `);

  insertComment.run(t1Id, sarahId, 'Excellent work! The foreign key constraints and schema look solid.');
  insertComment.run(t1Id, alexId, 'Thanks Sarah! Everything is tested and foreign key cascades are working as expected.');

  insertComment.run(t3Id, alexId, 'Currently implementing HTML5 dragstart and drop listeners on column containers.');
  insertComment.run(t3Id, emmaId, 'Let me know once ready so I can run UI drag testing across browsers!');

  insertComment.run(t5Id, johnId, 'I have provided UI mockups for the comment thread layout in Figma.');

  console.log('Database seeded successfully!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
