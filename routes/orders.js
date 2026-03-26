const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all orders (with customer phone from users table)
router.get('/', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT 
                o.id, 
                o.user_email, 
                u.phone AS customer_phone,
                o.item_total, 
                o.delivery_charge, 
                o.handling_charge, 
                o.grand_total, 
                o.status, 
                o.created_at,
                o.payment_method,
                o.payment_details,
                o.delivery_address
            FROM orders o
            LEFT JOIN users u ON o.user_email = u.email
            ORDER BY o.created_at DESC
        `);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get detailed order items for a specific order
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [items] = await db.query(`
            SELECT 
                id,
                product_name,
                image_url,
                price,
                quantity,
                amount
            FROM order_items
            WHERE order_id = ?
        `, [id]);

        res.json(items);
    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    try {
        await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Order status updated successfully', id, status });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
