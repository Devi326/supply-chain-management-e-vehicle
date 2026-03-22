const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const { protect, requireLevel } = require('../middleware/auth');
const { query } = require('express-validator');
const validate = require('../middleware/validate');

// @route   GET /api/reports/dashboard
router.get('/dashboard', protect, requireLevel(3), async (req, res) => {
    try {
        const [totalProducts, totalCategories, totalSales, totalUsers, sales] = await Promise.all([
            Product.countDocuments(),
            Category.countDocuments(),
            Sale.countDocuments(),
            User.countDocuments(),
            Sale.find().lean()
        ]);

        const total_revenue = sales.reduce((sum, s) => sum + s.price, 0);

        res.json({
            success: true,
            data: {
                total_products: totalProducts,
                total_categories: totalCategories,
                total_sales: totalSales,
                total_users: totalUsers,
                total_revenue
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/reports/daily
router.get('/daily', [
    protect,
    requireLevel(3),
    query('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year required'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
    validate
], async (req, res) => {
    const { year, month } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    try {
        const sales = await Sale.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    total_selling_price: { $sum: "$price" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({ success: true, data: sales.map(s => ({ date: s._id, total_selling_price: s.total_selling_price })) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/reports/monthly
router.get('/monthly', [
    protect,
    requireLevel(3),
    query('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year required'),
    validate
], async (req, res) => {
    const { year } = req.query;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    try {
        const sales = await Sale.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
                    total_selling_price: { $sum: "$price" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({ success: true, data: sales.map(s => ({ date: s._id, total_selling_price: s.total_selling_price })) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/reports/range
router.get('/range', [
    protect,
    requireLevel(3),
    query('start').isDate().withMessage('Valid start date required'),
    query('end').isDate().withMessage('Valid end date required'),
    validate
], async (req, res) => {
    const { start, end } = req.query;
    try {
        const sales = await Sale.find({
            date: { $gte: new Date(start), $lte: new Date(end) }
        }).populate('product', 'name buy_price').lean();

        const data = sales.map(s => ({
            date: s.date.toISOString().split('T')[0],
            name: s.product?.name || 'Deleted Product',
            total_sales: s.qty,
            total_selling_price: s.price,
            total_buying_price: (s.product?.buy_price || 0) * s.qty
        }));

        const summary = {
            total_revenue: data.reduce((sum, d) => sum + d.total_selling_price, 0),
            total_cost: data.reduce((sum, d) => sum + d.total_buying_price, 0)
        };
        summary.profit = summary.total_revenue - summary.total_cost;

        res.json({ success: true, data, summary });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
