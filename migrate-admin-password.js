/**
 * migrate-admin-password.js
 *
 * One-time script to hash all plain-text passwords in the admin_users table.
 * Run this ONCE after deploying the new auth.js that uses bcrypt.
 *
 * Usage:
 *   cd react_admin/server
 *   node migrate-admin-password.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function migrate() {
    const db = await mysql.createConnection({
        host: process.env.MYSQLHOST || 'localhost',
        port: process.env.MYSQLPORT || 3306,
        user: process.env.MYSQLUSER || 'root',
        password: process.env.MYSQLPASSWORD || '',
        database: process.env.MYSQLDATABASE || 'railway',
    });

    console.log('Connected to database. Fetching admin_users...');

    const [rows] = await db.query('SELECT id, email, password FROM admin_users');

    if (rows.length === 0) {
        console.log('No admin users found. Nothing to migrate.');
        await db.end();
        return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const row of rows) {
        // If the password already looks like a bcrypt hash, skip it
        if (row.password && row.password.startsWith('$2')) {
            console.log(`  [SKIP]    ${row.email} — already hashed`);
            skipped++;
            continue;
        }

        try {
            const hashed = await bcrypt.hash(row.password, 10);
            await db.query('UPDATE admin_users SET password = ? WHERE id = ?', [hashed, row.id]);
            console.log(`  [HASHED]  ${row.email}`);
            migrated++;
        } catch (err) {
            console.error(`  [ERROR]   ${row.email}:`, err.message);
        }
    }

    console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
    await db.end();
}

migrate().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
