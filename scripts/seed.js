const db = require('../models/database');

async function seed() {
    console.log('🌱 Starting database seed...');
    try {
        await db.init();
        console.log('✅ Database seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();