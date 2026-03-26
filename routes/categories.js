const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all categories
router.get('/', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create category
router.post('/', async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await db.query('INSERT INTO categories (category_name) VALUES (?)', [name]);
        res.status(201).json({ category_id: result.insertId, category_name: name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        await db.query('UPDATE categories SET category_name = ? WHERE category_id = ?', [name, id]);
        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete category
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Remove foreign key references first so the delete doesn't fail
        await db.query('UPDATE products SET category_id = NULL WHERE category_id = ?', [id]);
        await db.query('DELETE FROM categories WHERE category_id = ?', [id]);
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
