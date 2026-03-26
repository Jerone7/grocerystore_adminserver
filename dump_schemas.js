const db = require('./config/db');

async function dump() {
    try {
        const [categories] = await db.query('DESCRIBE categories');
        console.log('CATEGORIES SCHEMA:');
        console.log(categories);

        const [products] = await db.query('DESCRIBE products');
        console.log('\nPRODUCTS SCHEMA:');
        console.log(products);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

dump();
