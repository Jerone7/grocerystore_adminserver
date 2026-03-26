const db = require('./config/db');

async function testAddProduct() {
    const name = "Test Product " + Date.now();
    const description = "Test Description";
    const price = 10.99;
    const category_id = 1; // Assuming 1 exists based on earlier check
    const stock_quantity = 100;
    const weight_quantity = 500;
    const weight_unit = "g";
    const imageUrl = null;
    const isEnabled = 1;
    const isFeatured = 0;

    try {
        console.log('Attempting to insert product...');
        const [result] = await db.query(
            'INSERT INTO products (product_name, description, price, category_id, stock, weight_quantity, weight_unit, image_url, is_enabled, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, category_id, stock_quantity, weight_quantity, weight_unit, imageUrl, isEnabled, isFeatured]
        );
        console.log('Product inserted successfully. ID:', result.insertId);
        process.exit(0);
    } catch (err) {
        console.error('INSERT error:', err);
        process.exit(1);
    }
}

testAddProduct();
