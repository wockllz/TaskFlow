const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { redirectIfAuth } = require('../middleware/auth');

const AVATAR_COLORS = [
  '#3b82f6', '#ec4899', '#10b981', '#f59e0b', 
  '#8b5cf6', '#06b6d4', '#ef4444', '#6366f1'
];

function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// GET /register
router.get('/register', redirectIfAuth, (req, res) => {
  res.render('register', { error: null });
});

// POST /register
router.post('/register', redirectIfAuth, (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password) {
    return res.render('register', { error: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.render('register', { error: 'Passwords do not match.' });
  }

  if (password.length < 6) {
    return res.render('register', { error: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check if username or email exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.render('register', { error: 'Username or email already in use.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const color = getRandomColor();

    const result = db.prepare(`
      INSERT INTO users (username, email, password, avatar_color)
      VALUES (?, ?, ?, ?)
    `).run(username.trim(), email.trim().toLowerCase(), hashedPassword, color);

    req.session.user = {
      id: result.lastInsertRowid,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      avatar_color: color
    };

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Registration error:', err);
    res.render('register', { error: 'Failed to create account. Please try again.' });
  }
});

// GET /login
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('login', { error: null });
});

// POST /login
router.post('/login', redirectIfAuth, (req, res) => {
  const { loginInput, password } = req.body;

  if (!loginInput || !password) {
    return res.render('login', { error: 'Please enter both email/username and password.' });
  }

  try {
    const user = db.prepare(`
      SELECT * FROM users WHERE email = ? OR username = ?
    `).get(loginInput.trim().toLowerCase(), loginInput.trim());

    if (!user) {
      return res.render('login', { error: 'Invalid email/username or password.' });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.render('login', { error: 'Invalid email/username or password.' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_color: user.avatar_color || '#4f46e5'
    };

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'An error occurred during login.' });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
