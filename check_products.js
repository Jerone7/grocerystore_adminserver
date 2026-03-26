const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const db = pool.promise();

async function checkProducts() {
    try {
        const [products] = await db.query('SELECT * FROM products LIMIT 5');
        console.log('Sample Products:', products);
        process.exit(0);
    } catch (err) {
        console.error('Database error:', err);
        process.exit(1);
    }
}

checkProducts();
