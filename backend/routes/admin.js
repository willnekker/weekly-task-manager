const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { body, validationResult } = require('express-validator');

// GET all users (admin only)
router.get('/users', (req, res) => {
    const db = getDb();
    const users = db.prepare('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
});

// GET current settings (admin only)
router.get('/settings', (req, res) => {
    const db = getDb();
    const settings = db.prepare('SELECT allow_signups FROM settings WHERE id = 1').get();
    res.json(settings);
});

// PUT (update) settings (admin only)
router.put('/settings', [
    body('allow_signups').isBoolean().withMessage('allow_signups must be a boolean')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { allow_signups } = req.body;
    const db = getDb();
    
    try {
        db.prepare('UPDATE settings SET allow_signups = ? WHERE id = 1').run(allow_signups ? 1 : 0);
        res.json({ message: 'Settings updated successfully.', allow_signups });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating settings' });
    }
});

module.exports = router;
