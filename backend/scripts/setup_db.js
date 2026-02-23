const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function setupDatabase() {
    const schemaPath = path.join(__dirname, '../sql/001_schema.sql');
    const seedPath = path.join(__dirname, '../sql/002_seed.sql');

    try {
        console.log('🚀 Starting Database Setup...');

        // 1. Read Schema
        console.log('📖 Reading schema file...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // 2. Execute Schema
        console.log('🏗️ Applying schema...');
        await pool.query(schemaSql);
        console.log('✅ Schema applied successfully!');

        // 3. Read Seed Data
        console.log('📖 Reading seed data file...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        // 4. Execute Seed
        console.log('🌱 Seeding data...');
        await pool.query(seedSql);
        console.log('✅ Data seeded successfully!');

        console.log('🎉 Database setup completed!');
    } catch (error) {
        console.error('❌ Error during database setup:');
        if (error.message.includes('password authentication failed')) {
            console.error('🔑 PASSWORD ERROR: Please update your password in the .env file.');
        } else {
            console.error(error.message);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupDatabase();
