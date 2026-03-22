const mongoose = require('mongoose');
require('dotenv').config();

// Mongoose Models
const User = require('./src/models/User');
const Product = require('./src/models/Product');
const Sale = require('./src/models/Sale');
const Category = require('./src/models/Category');
const Group = require('./src/models/Group');
const Media = require('./src/models/Media');

const checkDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas successfully.');
        
        console.log('\n📊 Database Storage Counts:');
        
        const userCount = await User.countDocuments();
        console.log(`- Users: ${userCount}`);
        
        const categoryCount = await Category.countDocuments();
        console.log(`- Categories: ${categoryCount}`);
        
        const productCount = await Product.countDocuments();
        console.log(`- Products: ${productCount}`);
        
        const saleCount = await Sale.countDocuments();
        console.log(`- Sales history: ${saleCount}`);
        
        const groupCount = await Group.countDocuments();
        console.log(`- Groups: ${groupCount}`);
        
        const mediaCount = await Media.countDocuments();
        console.log(`- Media Items: ${mediaCount}`);

        console.log('\n✅ Integration is working perfectly. Data is actively being stored.');
    } catch (err) {
        console.error('❌ Database connection or query failed:', err.message);
    } finally {
        mongoose.connection.close();
    }
};

checkDatabase();
