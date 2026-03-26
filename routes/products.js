const express = require('express');
const router = express.Router();
const db = require('../config/db');
const supabase = require('../config/supabase');
const multer = require('multer');

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });
let hasCheckedIsEnabledColumn = false;
let hasCheckedIsFeaturedColumn = false;
let hasCheckedStoragePathColumn = false;

const PRODUCT_BUCKET = 'products';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
    'image/webp',
    'image/jpeg',
    'image/jpg',
    'image/png',
]);

const normalizeDbBooleanValue = (value) => {
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

const ensureIsFeaturedColumn = async () => {
    if (hasCheckedIsFeaturedColumn) {
        return;
    }

    const [columns] = await db.query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'products'
           AND COLUMN_NAME = 'is_featured'
         LIMIT 1`
    );

    if (columns.length === 0) {
        await db.query('ALTER TABLE products ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0');
    }

    hasCheckedIsFeaturedColumn = true;
};

const ensureStoragePathColumn = async () => {
    if (hasCheckedStoragePathColumn) {
        return;
    }

    const [columns] = await db.query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'products'
           AND COLUMN_NAME = 'storage_path'
         LIMIT 1`
    );

    if (columns.length === 0) {
        await db.query('ALTER TABLE products ADD COLUMN storage_path VARCHAR(255) NULL AFTER image_url');
    }

    hasCheckedStoragePathColumn = true;
};

const validateFile = (file) => {
    if (!file) return null;

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return 'Only webp, jpg, jpeg, and png files are allowed.';
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return 'Image size must be 5 MB or less.';
    }

    return null;
};

// Get all products
router.get('/', async (req, res) => {
    try {
        await ensureIsEnabledColumn();
        await ensureIsFeaturedColumn();
        await ensureStoragePathColumn();

        const includeDisabled = String(req.query.include_disabled || '').toLowerCase() === 'true';
        const baseQuery = 'SELECT product_id as id, product_name as name, description, price, category_id, stock as stock_quantity, weight_quantity, weight_unit, image_url, storage_path, is_enabled, is_featured FROM products';
        const query = includeDisabled ? baseQuery : `${baseQuery} WHERE is_enabled = 1`;
        const [products] = await db.query(query);
        const normalizedProducts = products.map((product) => ({
            ...product,
            is_enabled: normalizeDbBooleanValue(product.is_enabled),
            is_featured: normalizeDbBooleanValue(product.is_featured),
        }));
        res.json(normalizedProducts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create product (with image upload)
router.post('/', upload.single('image'), async (req, res) => {
    const { name, description, price, category_id, stock_quantity, weight_quantity, weight_unit, is_featured } = req.body;
    const isEnabled = req.body.is_enabled === undefined ? 1 : Number(req.body.is_enabled) === 1 ? 1 : 0;
    const isFeatured = Number(is_featured) === 1 ? 1 : 0;
    const file = req.file;
    let imageUrl = null;
    let storagePath = null;

    try {
        console.log('POST /products request received');
        console.log('Body:', req.body);
        console.log('File:', req.file ? `Yes (${req.file.originalname})` : 'No');

        const validationError = validateFile(file);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        await ensureIsEnabledColumn();
        await ensureIsFeaturedColumn();
        await ensureStoragePathColumn();

        if (file) {
            console.log('Uploading image to Supabase...');
            const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileName = `items/${Date.now()}_${safeFileName}`;
            const { data, error } = await supabase.storage
                .from(PRODUCT_BUCKET)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                });

            if (error) {
                console.error('Supabase upload error:', error);
                throw error;
            }

            console.log('Image uploaded successfully:', data.path);
            storagePath = fileName;

            const { data: publicUrlData } = supabase.storage
                .from(PRODUCT_BUCKET)
                .getPublicUrl(fileName);

            imageUrl = publicUrlData.publicUrl;
            console.log('Public URL:', imageUrl);
        }

        const [result] = await db.query(
            'INSERT INTO products (product_name, description, price, category_id, stock, weight_quantity, weight_unit, image_url, storage_path, is_enabled, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, category_id, stock_quantity, weight_quantity, weight_unit, imageUrl, storagePath, isEnabled, isFeatured]
        );

        res.status(201).json({ id: result.insertId, name, imageUrl, is_enabled: isEnabled, is_featured: isFeatured, message: 'Product created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Update product (with image upload)
router.put('/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, description, price, category_id, stock_quantity, weight_quantity, weight_unit, is_featured } = req.body;
    const file = req.file;
    let imageUrl = null;
    let storagePath = null;

    try {
        console.log(`PUT /products/${id} request received`);
        console.log('File:', req.file ? req.file.originalname : 'No');

        const validationError = validateFile(file);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        await ensureIsEnabledColumn();
        await ensureIsFeaturedColumn();
        await ensureStoragePathColumn();

        // Fetch existing product to get old storage_path
        const [existingRows] = await db.query('SELECT storage_path FROM products WHERE product_id = ?', [id]);
        const existingProduct = existingRows[0];

        if (file) {
            console.log('Uploading new image to Supabase...');
            const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileName = `items/${Date.now()}_${safeFileName}`;
            const { error } = await supabase.storage
                .from(PRODUCT_BUCKET)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from(PRODUCT_BUCKET)
                .getPublicUrl(fileName);

            imageUrl = publicUrlData.publicUrl;
            storagePath = fileName;

            // Delete old image if it exists
            if (existingProduct && existingProduct.storage_path) {
                const { error: deleteError } = await supabase.storage
                    .from(PRODUCT_BUCKET)
                    .remove([existingProduct.storage_path]);
                if (deleteError) console.error('Error deleting old image:', deleteError);
            }
        }

        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) { updateFields.push('product_name = ?'); updateValues.push(name); }
        if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
        if (price !== undefined) { updateFields.push('price = ?'); updateValues.push(price); }
        if (category_id !== undefined) { updateFields.push('category_id = ?'); updateValues.push(category_id); }
        if (stock_quantity !== undefined) { updateFields.push('stock = ?'); updateValues.push(stock_quantity); }
        if (weight_quantity !== undefined) { updateFields.push('weight_quantity = ?'); updateValues.push(weight_quantity); }
        if (weight_unit !== undefined) { updateFields.push('weight_unit = ?'); updateValues.push(weight_unit); }
        if (is_featured !== undefined) { updateFields.push('is_featured = ?'); updateValues.push(Number(is_featured) === 1 ? 1 : 0); }
        if (imageUrl) { updateFields.push('image_url = ?'); updateValues.push(imageUrl); }
        if (storagePath) { updateFields.push('storage_path = ?'); updateValues.push(storagePath); }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        const query = `UPDATE products SET ${updateFields.join(', ')} WHERE product_id = ?`;
        await db.query(query, [...updateValues, id]);
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
        // Fetch storage_path before deleting
        const [rows] = await db.query('SELECT storage_path FROM products WHERE product_id = ?', [id]);
        const product = rows[0];

        await db.query('DELETE FROM products WHERE product_id = ?', [id]);

        if (product && product.storage_path) {
            const { error: deleteError } = await supabase.storage
                .from(PRODUCT_BUCKET)
                .remove([product.storage_path]);
            if (deleteError) console.error('Error deleting image from Supabase:', deleteError);
        }

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
