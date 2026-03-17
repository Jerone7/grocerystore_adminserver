const express = require('express');
const router = express.Router();
const db = require('../config/db');
const supabase = require('../config/supabase');
const multer = require('multer');

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });
let hasCheckedIsEnabledColumn = false;

const normalizeDbEnabledValue = (value) => {
    if (Buffer.isBuffer(value)) {
        return value[0] === 1 ? 1 : 0;
    }

    if (value && typeof value === 'object' && Array.isArray(value.data)) {
        return value.data[0] === 1 ? 1 : 0;
    }

    return Number(value) === 1 ? 1 : 0;
};

const ensureIsEnabledColumn = async () => {
    if (hasCheckedIsEnabledColumn) {
        return;
    }

    const [columns] = await db.query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'products'
           AND COLUMN_NAME = 'is_enabled'
         LIMIT 1`
    );

    if (columns.length === 0) {
        await db.query('ALTER TABLE products ADD COLUMN is_enabled TINYINT(1) NOT NULL DEFAULT 1');
    }

    hasCheckedIsEnabledColumn = true;
};

// Get all products
router.get('/', async (req, res) => {
    try {
        await ensureIsEnabledColumn();

        const includeDisabled = String(req.query.include_disabled || '').toLowerCase() === 'true';
        const baseQuery = 'SELECT product_id as id, product_name as name, description, price, category_id, stock as stock_quantity, weight_quantity, weight_unit, image_url, is_enabled FROM products';
        const query = includeDisabled ? baseQuery : `${baseQuery} WHERE is_enabled = 1`;
        const [products] = await db.query(query);
        const normalizedProducts = products.map((product) => ({
            ...product,
            is_enabled: normalizeDbEnabledValue(product.is_enabled),
        }));
        res.json(normalizedProducts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create product (with image upload)
router.post('/', upload.single('image'), async (req, res) => {
    const { name, description, price, category_id, stock_quantity, weight_quantity, weight_unit } = req.body;
    const isEnabled = req.body.is_enabled === undefined ? 1 : Number(req.body.is_enabled) === 1 ? 1 : 0;
    const file = req.file;
    let imageUrl = null;

    try {
        await ensureIsEnabledColumn();

        if (file) {
            const fileName = `items/${Date.now()}_${file.originalname}`;
            const { data, error } = await supabase.storage
                .from('products') // Replace with your actual bucket name
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('products')
                .getPublicUrl(fileName);

            imageUrl = publicUrlData.publicUrl;
        }

        const [result] = await db.query(
            'INSERT INTO products (product_name, description, price, category_id, stock, weight_quantity, weight_unit, image_url, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, category_id, stock_quantity, weight_quantity, weight_unit, imageUrl, isEnabled]
        );

        res.status(201).json({ id: result.insertId, name, imageUrl, is_enabled: isEnabled, message: 'Product created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, category_id, stock_quantity, weight_quantity, weight_unit } = req.body;

    try {
        await ensureIsEnabledColumn();

        await db.query(
            'UPDATE products SET product_name = ?, description = ?, price = ?, category_id = ?, stock = ?, weight_quantity = ?, weight_unit = ? WHERE product_id = ?',
            [name, description, price, category_id, stock_quantity, weight_quantity, weight_unit, id]
        );
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enable/disable product
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { is_enabled } = req.body;

    console.log(`PATCH /products/${id}/status received with is_enabled:`, is_enabled);

    if (typeof is_enabled === 'undefined') {
        return res.status(400).json({ error: 'is_enabled is required' });
    }

    const normalizedStatus = Number(is_enabled) === 1 ? 1 : 0;

    try {
        await ensureIsEnabledColumn();

        const [result] = await db.query(
            'UPDATE products SET is_enabled = ? WHERE product_id = ?',
            [normalizedStatus, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.json({
            message: `Product ${normalizedStatus === 1 ? 'enabled' : 'disabled'} successfully`,
            id: Number(id),
            is_enabled: normalizedStatus,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE product_id = ?', [id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle product status
router.put("/toggle/:id", async (req, res) => {
    try {
        await db.query(
            "UPDATE products SET is_enabled = NOT is_enabled WHERE product_id = ?",
            [req.params.id]
        )
        res.json({ message: "Product status updated" })
    } catch (err) {
        res.status(500).json(err)
    }
})

module.exports = router;
