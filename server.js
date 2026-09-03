const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const db = require('./db/database');
const seedDatabase = require('./db/seed');
const { setUser } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS View Engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'codealpha_secret_key_2026_super_secure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true
  }
}));

// Pass logged-in user to views
app.use(setUser);

// Auto-seed database on start if no users exist
try {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Database empty. Initializing seed data...');
    seedDatabase();
  }
} catch (err) {
  console.error('Auto-seed check failed:', err);
}

// Routes
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/', projectRoutes);
app.use('/', taskRoutes);
app.use('/', commentRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', { message: 'Page Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).send('Internal Server Error');
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CodeAlpha TaskFlow running on http://localhost:${PORT}`);
  console.log(`====================================================`);
});
