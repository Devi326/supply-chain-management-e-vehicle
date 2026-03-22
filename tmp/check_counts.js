const mongoose = require('mongoose');
require('dotenv').config();

async function checkCounts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collections = ['products', 'categories', 'sales', 'users'];
        console.log('--- Database Counts ---');
        for (const col of collections) {
            const count = await db.collection(col).countDocuments();
            console.log(`${col}: ${count}`);
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCounts();
