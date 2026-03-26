const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM admin_users WHERE email = ?', [email]);

        if (rows.length === 0) {
            console.log(`Login failed: User not found (${email})`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const admin = rows[0];
        console.log(`[AUTH] Login attempt: ${email}`);
        
        // Try bcrypt first
        let passwordMatch = false;
        try {
            passwordMatch = await bcrypt.compare(password, admin.password);
        } catch (e) {
            console.log(`[AUTH] Bcrypt error (likely plain text in DB): ${e.message}`);
        }

        // Fallback to simple string comparison if requested for debugging
        if (!passwordMatch && password === admin.password) {
            console.log(`[AUTH] Plain text match for: ${email}`);
            passwordMatch = true;
        }

        if (!passwordMatch) {
            console.log(`[AUTH] Invalid credentials for: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        
        console.log(`[AUTH] Success: ${email}`);

        const token = jwt.sign(
            { id: admin.id, email: admin.email },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { id: admin.id, email: admin.email, name: admin.name || admin.email },
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/auth/verify - validate a token (used by ProtectedRoute)
router.get('/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch {
        res.status(401).json({ valid: false });
    }
});

module.exports = router;
