const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, requireLevel } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// @route   GET /api/categories
router.get('/', protect, requireLevel(3), async (req, res) => {
    try {
        const cats = await Category.find().sort({ name: 1 });
        res.json({ success: true, data: cats.map(c => ({ ...c.toObject(), id: c._id })) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/categories
router.post('/', [
    protect,
    requireLevel(2),
    body('name').notEmpty().withMessage('Category name is required').trim(),
    validate
], async (req, res) => {
    try {
        const cat = new Category({ name: req.body.name });
        await cat.save();
        res.status(201).json({ success: true, data: cat });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   PUT /api/categories/:id
router.put('/:id', [
    protect,
    requireLevel(2),
    body('name').notEmpty().withMessage('Category name is required').trim(),
    validate
], async (req, res) => {
    try {
        const cat = await Category.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
        res.json({ success: true, data: cat });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   DELETE /api/categories/:id
const Product = require('../models/Product');

// ...

router.delete('/:id', protect, requireLevel(2), async (req, res) => {
    try {
        const productCount = await Product.countDocuments({ category: req.params.id });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category because it contains ${productCount} products. Delete the products first.`
            });
        }
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
