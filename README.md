# CodeAlpha Project Management Tool (Task 3)

A full-stack, collaborative Project Management Tool with Trello/Asana-style Kanban boards, task assignment, drag-and-drop card movement, and real-time comment threads. Built for Task 3 of the **CodeAlpha Full Stack Development Internship**.

---

## 🚀 Features

1. **Authentication & User Management**
   - User registration and login with encrypted passwords using `bcryptjs`.
   - Cookie-based session authentication with `express-session`.
   - Custom avatar colors generated for each user.
   - Quick one-click demo login buttons for seamless testing.

2. **Group Projects & Team Collaboration**
   - Create group projects with title, description, and owner tracking.
   - Add project members by username or email.
   - Project dashboard with progress bars, task completion metrics, and member avatar stacks.

3. **Kanban Project Board & Task Cards**
   - Trello-style 3-column Kanban board: **To Do**, **In Progress**, **Done**.
   - Custom HTML5 Drag & Drop engine for task cards between status columns.
   - Instant AJAX `PATCH` updates to sync board status without full page reloads.
   - Task cards display priority tags (Low/Medium/High), assignee avatars, due dates, and comment counts.

4. **Task Assignment & Details**
   - Assign tasks to specific project members or keep them unassigned.
   - Detailed task view with title, description, priority, due date, creator, and assignee selector.

5. **Task Comments & Communication**
   - Discussion thread attached to every task card.
   - Team members can add comments, ask questions, and share updates.
   - Comment authors and project owners can remove comments.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (using `better-sqlite3` with foreign key enforcement)
- **View Engine:** EJS (Embedded JavaScript templates)
- **Frontend:** HTML5, CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (Drag & Drop API)
- **Authentication:** `bcryptjs` for password hashing, `express-session` for session handling

---

## 📁 Project Structure

```
CodeAlpha_ProjectManagementTool/
├── server.js               # Express application entry point
├── package.json            # Dependencies and scripts
├── .gitignore              # Git ignore configuration
├── README.md               # Project documentation
├── db/
│   ├── database.js         # SQLite database initialization
│   ├── schema.sql          # Relational SQL schema definitions
│   └── seed.js             # Seed script for initial sample data
├── middleware/
│   └── auth.js             # Authentication & session middleware
├── routes/
│   ├── auth.js             # Login, register, logout routes
│   ├── projects.js         # Project dashboard & member management
│   ├── tasks.js            # Task creation, board updates & status API
│   └── comments.js         # Task comment thread routes
├── views/
│   ├── partials/
│   │   ├── header.ejs      # Top navigation & flash alerts
│   │   ├── footer.ejs      # App footer
│   │   └── task_card.ejs   # Reusable Kanban task card partial
│   ├── dashboard.ejs       # Projects overview dashboard
│   ├── project.ejs         # Kanban board view
│   ├── task.ejs            # Task detail & comment thread view
│   ├── login.ejs           # User login page
│   ├── register.ejs        # User registration page
│   └── 404.ejs             # Error page
└── public/
    ├── css/
    │   └── style.css       # Clean, modern responsive UI styles
    └── js/
        └── main.js         # Drag-and-drop & modal interactivity
```

---

## ⚡ How to Run the Application

### 1. Installation
In the project root directory, install all required dependencies:
```bash
npm install
```

### 2. Start the Server
Start the application using:
```bash
npm start
```
The server will automatically create the SQLite database (`db/project_management.db`) and populate it with initial seed data on first run.

Access the application in your browser at:
**[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Demo User Credentials

To quickly explore the application without manually registering, use these seeded accounts:

| User | Email / Username | Password | Role |
|------|------------------|----------|------|
| **Sarah Jenkins** | `sarah@codealpha.com` or `sarah_pm` | `password123` | Project Owner / PM |
| **Alex Rivera** | `alex@codealpha.com` or `alex_dev` | `password123` | Full Stack Developer |
| **John Doe** | `john@codealpha.com` or `john_design` | `password123` | UI/UX Designer |
| **Emma Watson** | `emma@codealpha.com` or `emma_qa` | `password123` | QA Engineer |

*(Clicking the demo buttons on the login page pre-fills these credentials automatically).*

---

## 2 Database Schema Overview

The SQLite database uses 5 interconnected tables with foreign key cascades:

- `users`: User profiles with hashed passwords and avatar color choices.
- `projects`: Group project details and owner tracking.
- `project_members`: Junction table mapping users to projects with roles (`owner`, `member`).
- `tasks`: Task cards with status (`todo`, `in_progress`, `done`), priority, assignee reference, and due dates.
- `comments`: Comments linked to specific tasks and authored by project members.

---

## 📄 License & Credits

Built as part of the **CodeAlpha Full Stack Development Internship** - Task 3.
License: MIT.
