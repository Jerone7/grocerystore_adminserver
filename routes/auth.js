const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM admin_users WHERE email = ? AND password = ?', [email, password]);

        if (rows.length > 0) {
            // In a production app, you would issue a JWT token here
            res.json({ success: true, message: 'Login successful', user: rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
