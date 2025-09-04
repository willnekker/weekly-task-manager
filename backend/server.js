require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, getDb } = require('./db');
const authMiddleware = require('./auth');
const taskRoutes = require('./routes/tasks');
const adminRoutes = require('./routes/admin');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// --- Initialize Database ---
try {
  initDb();
  console.log("Database initialized successfully.");
} catch (error) {
  console.error("FATAL: Database initialization failed.", error);
  process.exit(1);
}

// --- Middleware ---
app.set('trust proxy', 1); // Trust the first proxy (Nginx)
app.use(cors());
app.use(express.json());

// --- Rate Limiting ---
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many accounts created from this IP, please try again after an hour',
});

// app.use('/api/', apiLimiter);

// --- Routes ---
// Auth Routes
app.post('/api/login', [
    body('username').notEmpty().trim(),
    body('password').notEmpty()
], (req, res) => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.body.username);
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = bcrypt.compareSync(req.body.password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
});

app.get('/api/signup-status', (req, res) => {
    const db = getDb();
    const settings = db.prepare('SELECT allow_signups FROM settings WHERE id = 1').get();
    res.json({ allowSignups: settings ? !!settings.allow_signups : true });
});

app.post('/api/signup', signupLimiter, [
    body('username').isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const db = getDb();
    const settings = db.prepare('SELECT allow_signups FROM settings WHERE id = 1').get();
    if (!settings || !settings.allow_signups) {
        return res.status(403).json({ message: 'Sign-ups are currently disabled.' });
    }

    const { username, password } = req.body;
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
        const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)')
                         .run(username, hashedPassword);
        const newUser = { id: result.lastInsertRowid, username };
        const token = jwt.sign({ id: newUser.id, username: newUser.username, is_admin: 0 }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { ...newUser, is_admin: 0 } });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.get('/api/me', authMiddleware.verifyToken, (req, res) => {
    const db = getDb();
    const user = db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
});


app.use('/api/tasks', authMiddleware.verifyToken, taskRoutes);
app.use('/api/admin', authMiddleware.verifyToken, authMiddleware.isAdmin, adminRoutes);

// --- Scheduled Task Rollover ---
// Runs every day at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Running daily task rollover job...');
    const db = getDb();
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[dayOfWeek];
    
    // We only roll over on weekdays, from the previous day
    // On Monday (1), we roll from Friday (5)
    // On Tue-Fri (2-5), we roll from the previous day (1-4)
    // We don't roll over on Sat (6) or Sun (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log("It's the weekend, no tasks will be rolled over.");
        return;
    }

    const sourceDay = dayOfWeek === 1 ? 'Friday' : days[dayOfWeek - 1];
    const destinationDay = currentDay;
    
    try {
        const transaction = db.transaction(() => {
            const tasksToMove = db.prepare(`
                SELECT id, position FROM tasks 
                WHERE day = ? AND completed = 0 
                ORDER BY position ASC
            `).all(sourceDay);
            
            if (tasksToMove.length === 0) {
                console.log(`No incomplete tasks from ${sourceDay} to move.`);
                return;
            }

            const maxPositionStmt = db.prepare(`SELECT MAX(position) as max_pos FROM tasks WHERE day = ?`);
            const updateStmt = db.prepare(`UPDATE tasks SET day = ?, position = ? WHERE id = ?`);

            let { max_pos } = maxPositionStmt.get(destinationDay);
            let nextPosition = (max_pos === null) ? 0 : max_pos + 1;

            for (const task of tasksToMove) {
                updateStmt.run(destinationDay, nextPosition, task.id);
                nextPosition++;
            }
            console.log(`Successfully moved ${tasksToMove.length} tasks from ${sourceDay} to ${destinationDay}.`);
        });

        transaction();
    } catch (err) {
        console.error("Error during task rollover transaction:", err.message);
    }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
