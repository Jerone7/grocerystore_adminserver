const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdminAccount() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQLHOST,
            port: process.env.MYSQLPORT,
            user: process.env.MYSQLUSER,
            password: process.env.MYSQLPASSWORD,
            database: process.env.MYSQLDATABASE
        });

        console.log('Connected to Railway DB.');
        const [rows] = await connection.execute('SELECT email, password FROM admin_users');
        console.log('Admin Users:');
        console.table(rows);
        await connection.end();
    } catch (error) {
        console.error('Error connecting to DB:', error.message);
    }
}

checkAdminAccount();
