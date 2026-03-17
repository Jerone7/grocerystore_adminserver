const db = require('./config/db');

const categories = [
    'Fruits',
    'Vegetables',
    'Dairy',
    'Bakery',
    'Meat',
    'Beverages',
    'Snacks',
    'Personal Care',
    'Household'
];

async function seedCategories() {
    try {
        console.log('Seeding categories...');

        // Create table if not exists (though check_db showed it exists, good to be safe/consistent)
        await db.query(`
            CREATE TABLE IF NOT EXISTS categories (
                category_id INT AUTO_INCREMENT PRIMARY KEY,
                category_name VARCHAR(255) NOT NULL UNIQUE
            )
        `);

        for (const category of categories) {
            try {
                await db.query('INSERT IGNORE INTO categories (category_name) VALUES (?)', [category]);
                console.log(`Added/Ensured category: ${category}`);
            } catch (err) {
                console.error(`Error adding ${category}:`, err.message);
            }
        }

        console.log('Categories seeded successfully.');
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedCategories();
