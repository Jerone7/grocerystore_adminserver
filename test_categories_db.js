const db = require('./config/db');

async function testCategories() {
    try {
        console.log('--- Testing Categories ---');

        // 1. Create category
        const testName = 'Test Category ' + Date.now();
        const [insertResult] = await db.query('INSERT INTO categories (category_name) VALUES (?)', [testName]);
        const newId = insertResult.insertId;
        console.log('Created category ID:', newId);

        // 2. Update category
        const updatedName = testName + ' Updated';
        await db.query('UPDATE categories SET category_name = ? WHERE category_id = ?', [updatedName, newId]);
        console.log('Updated category ID:', newId);

        // 3. Verify update
        const [rows] = await db.query('SELECT * FROM categories WHERE category_id = ?', [newId]);
        if (rows[0].category_name === updatedName) {
            console.log('Update verified.');
        } else {
            throw new Error('Update verification failed');
        }

        // 4. Delete category
        await db.query('DELETE FROM categories WHERE category_id = ?', [newId]);
        console.log('Deleted category.');

        // 5. Verify deletion
        const [afterDelete] = await db.query('SELECT * FROM categories WHERE category_id = ?', [newId]);
        if (afterDelete.length === 0) {
            console.log('Deletion verified.');
        } else {
            throw new Error('Deletion verification failed');
        }

        console.log('--- Categories Test Passed ---');
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

testCategories();
