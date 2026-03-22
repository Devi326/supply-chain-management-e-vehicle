const mongoose = require('mongoose');
require('dotenv').config();

async function seedSampleData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        // 1. Add Sample Category
        const catResult = await db.collection('categories').insertOne({
            name: 'Electric Scooters',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const catId = catResult.insertedId;
        console.log('Added Category: Electric Scooters');

        // 2. Add Sample Product
        const prodResult = await db.collection('products').insertOne({
            name: 'Lite-E S1',
            quantity: 25,
            buy_price: 15000,
            sale_price: 22000,
            category: catId,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('Added Product: Lite-E S1');

        await mongoose.disconnect();
        console.log('Seeding complete!');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedSampleData();
