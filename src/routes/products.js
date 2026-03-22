const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Media = require('../models/Media');
const Sale = require('../models/Sale');
const { protect, requireLevel } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// @route   GET /api/products
router.get('/', protect, requireLevel(3), async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category', 'name')
            .populate('image', 'file_name')
            .sort({ createdAt: -1 });

        const result = products.map(p => ({
            ...p.toObject(),
            id: p._id,
            category: p.category?.name || 'N/A',
            image: p.image?.file_name || 'no_image.jpg'
        }));

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/products
router.post('/', [
    protect,
    requireLevel(2),
    body('name').notEmpty().withMessage('Product name is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
    body('buy_price').isFloat({ min: 0 }).withMessage('Buy price must be a positive number'),
    body('sale_price').isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),
    body('categorie_id').notEmpty().withMessage('Category is required'),
    validate
], async (req, res) => {
    try {
        const productData = { ...req.body };
        if (!productData.media_id) delete productData.media_id;
        if (!productData.image && productData.media_id) productData.image = productData.media_id;

        const product = new Product({
            ...productData,
            category: req.body.categorie_id // Support old field name from frontend
        });
        await product.save();
        res.status(201).json({ success: true, data: product });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   PUT /api/products/:id
router.put('/:id', [
    protect,
    requireLevel(2),
    body('name').optional().notEmpty().withMessage('Product name cannot be empty'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
    body('buy_price').optional().isFloat({ min: 0 }).withMessage('Buy price must be a positive number'),
    body('sale_price').optional().isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),
    validate
], async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (updateData.categorie_id) updateData.category = updateData.categorie_id;
        
        // Handle empty media_id to avoid Mongoose CastError
        if (!updateData.media_id) {
            delete updateData.media_id;
        } else {
            updateData.image = updateData.media_id;
        }

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: product });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   DELETE /api/products/:id
router.delete('/:id', protect, requireLevel(2), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        // Check for existing sales
        const salesCount = await Sale.countDocuments({ product: req.params.id });
        if (salesCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete product "${product.name}" because it has ${salesCount} recorded sales history.`
            });
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/products/top
router.get('/top', protect, requireLevel(3), async (req, res) => {
    try {
        const topSales = await Sale.aggregate([
            {
                $group: {
                    _id: "$product",
                    totalQty: { $sum: "$qty" },
                    totalSold: { $sum: 1 }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: parseInt(req.query.limit) || 5 }
        ]);

        const productIds = topSales.map(s => s._id);
        const products = await Product.find({ _id: { $in: productIds } });

        const result = topSales.map(sale => {
            const product = products.find(p => p._id.toString() === sale._id.toString());
            return {
                ...product?.toObject(),
                id: sale._id,
                name: product?.name || 'Deleted Product',
                totalQty: sale.totalQty,
                totalSold: sale.totalSold
            };
        });

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
