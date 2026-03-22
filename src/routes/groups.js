const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const { protect, requireLevel } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// @route   GET /api/groups
router.get('/', protect, requireLevel(2), async (req, res) => {
    try {
        const groups = await Group.find().sort({ group_level: 1 });
        res.json({ success: true, data: groups.map(g => ({ ...g.toObject(), id: g._id })) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/groups
router.post('/', [
    protect,
    requireLevel(1),
    body('group_name').notEmpty().withMessage('Group name is required').trim(),
    body('group_level').isInt({ min: 1, max: 3 }).withMessage('Level must be between 1 and 3'),
    validate
], async (req, res) => {
    try {
        const group = new Group(req.body);
        await group.save();
        res.status(201).json({ success: true, data: group });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   PUT /api/groups/:id
router.put('/:id', [
    protect,
    requireLevel(1),
    body('group_name').optional().notEmpty().withMessage('Group name cannot be empty').trim(),
    body('group_level').optional().isInt({ min: 1, max: 3 }).withMessage('Level must be between 1 and 3'),
    validate
], async (req, res) => {
    try {
        const group = await Group.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: group });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
