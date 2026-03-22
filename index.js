require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');

connectDB();

const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadDir}`);
}

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const groupRoutes = require('./src/routes/groups');
const categoryRoutes = require('./src/routes/categories');
const productRoutes = require('./src/routes/products');
const salesRoutes = require('./src/routes/sales');
const mediaRoutes = require('./src/routes/media');
const reportRoutes = require('./src/routes/reports');

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.FRONTEND_URL, // Dynamic frontend url
        /\.onrender\.com$/, // Allow all Render subdomains
        /\.vercel\.app$/, // Allow Vercel environments
        /\.netlify\.app$/ // Allow Netlify environments
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.json({ success: true, message: 'EVehicle Supply Chain API is alive.' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'EVehicle Supply Chain API is running.', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
    console.log(`\n🚀 EVehicle Supply Chain API running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
