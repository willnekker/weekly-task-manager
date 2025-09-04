const sqlite = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}
const dbPath = path.join(dbDir, 'tasks.db');
let db;

function getDb() {
    if (!db) {
        db = new sqlite(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function initDb() {
    const currentDb = getDb();
    console.log("Initializing database schema...");

    const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`;

    const createTasksTable = `
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        day TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0,
        position INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );`;
    
    const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        allow_signups BOOLEAN DEFAULT 1
    );`;

    const createUpdatedAtTrigger = `
    CREATE TRIGGER IF NOT EXISTS update_tasks_updated_at
    AFTER UPDATE ON tasks
    FOR EACH ROW
    BEGIN
        UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;`;

    currentDb.exec(createUsersTable);
    currentDb.exec(createTasksTable);
    currentDb.exec(createSettingsTable);
    currentDb.exec(createUpdatedAtTrigger);
    
    // Ensure settings row exists
    const settingsCount = currentDb.prepare('SELECT COUNT(*) as count FROM settings').get().count;
    if (settingsCount === 0) {
        currentDb.prepare('INSERT INTO settings (id, allow_signups) VALUES (1, 1)').run();
        console.log("Initialized default settings.");
    }
    
    // Create admin user if it doesn't exist
    const adminUsername = process.env.ADMIN_USERNAME || 'willem';
    const adminExists = currentDb.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);
    
    if (!adminExists) {
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'password123';
        if (!adminPassword) {
            console.warn("WARNING: ADMIN_USERNAME is set but DEFAULT_ADMIN_PASSWORD is not. Cannot create admin user.");
            return;
        }
        const hashedPassword = bcrypt.hashSync(adminPassword, 10);
        currentDb.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)')
               .run(adminUsername, hashedPassword, 1);
        console.log(`Admin user '${adminUsername}' created successfully.`);
    }
}

module.exports = { initDb, getDb };
