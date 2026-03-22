const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Group = require('../models/Group');
const { protect, requireLevel } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const crypto = require('crypto');

const sha1 = (str) => crypto.createHash('sha1').update(str).digest('hex');

// @route   GET /api/users
router.get('/', protect, requireLevel(2), async (req, res) => {
    try {
        const users = await User.find().lean();

        // Manual join-like behavior for groups if needed, 
        // but we can just store level or fetch groups
        const groups = await Group.find().lean();
        const result = users.map(u => ({
            ...u,
            id: u._id,
            group_name: groups.find(g => g.group_level === u.user_level)?.group_name || 'N/A'
        }));

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/users
router.post('/', [
    protect,
    requireLevel(1),
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('username').notEmpty().withMessage('Username is required').trim(),
    body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters'),
    body('user_level').isInt({ min: 1, max: 3 }).withMessage('Invalid user level'),
    validate
], async (req, res) => {
    const { name, username, password, user_level, status } = req.body;
    try {
        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ success: false, message: 'Username already exists' });

        const user = new User({
            name,
            username,
            password: sha1(password),
            user_level: parseInt(user_level),
            status: parseInt(status) || 1
        });

        await user.save();
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   PUT /api/users/:id
router.put('/:id', [
    protect,
    requireLevel(1),
    body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
    body('username').optional().notEmpty().withMessage('Username cannot be empty').trim(),
    body('password').optional().isLength({ min: 5 }).withMessage('Password must be at least 5 characters'),
    body('user_level').optional().isInt({ min: 1, max: 3 }).withMessage('Invalid user level'),
    validate
], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { name, username, password, user_level, status } = req.body;
        if (name) user.name = name;
        if (username) user.username = username;
        if (password) user.password = sha1(password);
        if (user_level) user.user_level = parseInt(user_level);
        if (status !== undefined) user.status = parseInt(status);

        await user.save();
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   DELETE /api/users/:id
router.delete('/:id', protect, requireLevel(1), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
