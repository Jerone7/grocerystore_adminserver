const db = require('./config/db');

async function checkSchema() {
    try {
        console.log('--- Tables ---');
        const [tables] = await db.query('SHOW TABLES');
        console.log(tables);

        console.log('\n--- Products Table ---');
        const [productsDesc] = await db.query('DESCRIBE products');
        console.log(productsDesc);

        const tableNames = tables.map(t => Object.values(t)[0]);
        if (tableNames.includes('categories')) {
            console.log('\n--- Categories Table ---');
            const [categoriesDesc] = await db.query('DESCRIBE categories');
            console.log(categoriesDesc);
            console.log('\n--- Categories Data ---');
            const [categories] = await db.query('SELECT * FROM categories');
            console.log(categories);
        } else {
            console.log('\n--- No Categories Table Found ---');
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
