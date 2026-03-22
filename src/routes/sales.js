const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { protect, requireLevel } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// @route   GET /api/sales
router.get('/', protect, requireLevel(3), async (req, res) => {
    try {
        const sales = await Sale.find().populate('product', 'name').sort({ date: -1 });
        res.json({
            success: true,
            data: sales.map(s => ({
                ...s.toObject(),
                id: s._id,
                product_name: s.product?.name || 'Deleted Product',
                date: s.date.toISOString().split('T')[0]
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/sales
router.post('/', [
    protect,
    requireLevel(3),
    body('product_id').isMongoId().withMessage('Invalid product ID'),
    body('qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    validate
], async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { product_id, qty, price, date } = req.body;

        // 1. Check stock
        const product = await Product.findById(product_id).session(session);
        if (!product) throw new Error('Product not found');
        if (product.quantity < qty) throw new Error('Insufficient stock');

        // 2. Create sale
        const sale = new Sale({
            product: product_id,
            qty: parseInt(qty),
            price: parseFloat(price),
            date: date || new Date()
        });
        await sale.save({ session });

        // 3. Update stock
        product.quantity -= parseInt(qty);
        await product.save({ session });

        await session.commitTransaction();
        res.status(201).json({ success: true, id: sale._id, data: sale });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        session.endSession();
    }
});

// @route   PUT /api/sales/:id
router.put('/:id', [
    protect,
    requireLevel(3),
    body('qty').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    validate
], async (req, res) => {
    try {
        const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: sale });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   DELETE /api/sales/:id
router.delete('/:id', protect, requireLevel(3), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const sale = await Sale.findById(req.params.id).session(session);
        if (!sale) throw new Error('Sale not found');

        // Restore stock
        const product = await Product.findById(sale.product).session(session);
        if (product) {
            product.quantity += sale.qty;
            await product.save({ session });
        }

        await Sale.deleteOne({ _id: sale._id }).session(session);
        await session.commitTransaction();
        res.json({ success: true, message: 'Sale deleted' });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        session.endSession();
    }
});

// @route   GET /api/sales/recent
router.get('/recent', protect, requireLevel(3), async (req, res) => {
    try {
        const sales = await Sale.find().populate('product', 'name').sort({ date: -1 }).limit(parseInt(req.query.limit) || 5);
        res.json({ success: true, data: sales.map(s => ({ ...s.toObject(), product_name: s.product?.name, date: s.date.toISOString().split('T')[0] })) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
