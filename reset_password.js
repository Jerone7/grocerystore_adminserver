const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPassword() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQLHOST,
            port: process.env.MYSQLPORT,
            user: process.env.MYSQLUSER,
            password: process.env.MYSQLPASSWORD,
            database: process.env.MYSQLDATABASE
        });

        const email = 'admin@nmstore.com';
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log(`Resetting password for ${email} to "${newPassword}"...`);

        const [result] = await connection.execute(
            'UPDATE admin_users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        if (result.affectedRows > 0) {
            console.log('Password reset successful!');
        } else {
            console.log('User not found. Check if the email matches exactly.');
        }

        await connection.end();
    } catch (error) {
        console.error('Error resetting password:', error.message);
    }
}

resetPassword();
