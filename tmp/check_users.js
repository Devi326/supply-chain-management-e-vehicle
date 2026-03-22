const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log('--- Current Users ---');
        users.forEach(u => {
            console.log(`Username: ${u.username}, Level: ${u.user_level}, Role: ${u.role}`);
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
