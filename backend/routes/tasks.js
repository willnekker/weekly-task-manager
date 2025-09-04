const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { body, validationResult } = require('express-validator');

// GET all tasks for the logged-in user
router.get('/', (req, res) => {
    const db = getDb();
    const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY day, position').all(req.user.id);
    res.json(tasks);
});

// POST a new task
router.post('/', [
    body('text').notEmpty().trim().escape(),
    body('day').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { text, day } = req.body;
    const db = getDb();

    try {
        const maxPos = db.prepare('SELECT MAX(position) as max_pos FROM tasks WHERE user_id = ? AND day = ?').get(req.user.id, day);
        const newPosition = (maxPos && maxPos.max_pos !== null) ? maxPos.max_pos + 1 : 0;
        
        const stmt = db.prepare('INSERT INTO tasks (user_id, text, day, position) VALUES (?, ?, ?, ?)');
        const result = stmt.run(req.user.id, text, day, newPosition);

        const newTask = { id: result.lastInsertRowid, user_id: req.user.id, text, day, completed: 0, position: newPosition };
        res.status(201).json(newTask);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Error creating task" });
    }
});

// PUT (update) a task
router.put('/:id', [
    body('text').optional().notEmpty().trim().escape(),
    body('completed').optional().isBoolean(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { text, completed } = req.body;
    const db = getDb();

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!task) {
        return res.status(404).json({ message: "Task not found or you don't have permission" });
    }

    let query = 'UPDATE tasks SET ';
    const params = [];
    if (text !== undefined) {
        query += 'text = ?, ';
        params.push(text);
    }
    if (completed !== undefined) {
        query += 'completed = ?, ';
        params.push(completed ? 1 : 0);
    }
    
    if (params.length === 0) {
        return res.status(400).json({ message: "No update fields provided" });
    }

    query = query.slice(0, -2) + ' WHERE id = ? AND user_id = ?';
    params.push(id, req.user.id);
    
    try {
        db.prepare(query).run(...params);
        const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        res.json(updatedTask);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating task" });
    }
});

// DELETE a task
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    
    const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, req.user.id);

    if (result.changes > 0) {
        res.status(200).json({ message: 'Task deleted successfully' });
    } else {
        res.status(404).json({ message: 'Task not found or you do not have permission to delete it' });
    }
});

// POST to reorder tasks
router.post('/reorder', (req, res) => {
    const { reorderedTasks } = req.body; // Expects an array of {id, day, position} objects
    const db = getDb();

    const updateStmt = db.prepare('UPDATE tasks SET day = ?, position = ? WHERE id = ? AND user_id = ?');
    
    const transaction = db.transaction((tasks) => {
        for (const task of tasks) {
            if(task.id && task.day && task.position !== undefined) {
                 updateStmt.run(task.day, task.position, task.id, req.user.id);
            }
        }
    });

    try {
        transaction(reorderedTasks);
        res.status(200).json({ message: 'Tasks reordered successfully.' });
    } catch (err) {
        console.error("Reorder error:", err);
        res.status(500).json({ message: 'Failed to reorder tasks.' });
    }
});


module.exports = router;
