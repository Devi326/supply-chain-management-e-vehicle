const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const sha1 = (str) => crypto.createHash('sha1').update(str).digest('hex');

const { body } = require('express-validator');
const validate = require('../middleware/validate');

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
], async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        if (user.status === 0) {
            return res.status(403).json({ success: false, message: 'Your account is disabled' });
        }

        // Compare SHA1 passwords
        if (sha1(password) !== user.password) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        // Update last login
        user.last_login = new Date();
        await user.save();

        const token = jwt.sign(
            { id: user._id, username: user.username, user_level: user.user_level },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                user_level: user.user_level,
                image: user.image
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/auth/register
// @desc    Public registration for customers
router.post('/register', [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('username').notEmpty().withMessage('Username is required').trim(),
    body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters'),
    validate
], async (req, res) => {
    const { name, username, password } = req.body;

    try {
        const userExists = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
        if (userExists) return res.status(400).json({ success: false, message: 'Username already exists' });

        const user = new User({
            name,
            username,
            password: sha1(password),
            user_level: 3, // Default to Customer
            status: 1
        });

        await user.save();
        res.status(201).json({ success: true, message: 'Registration successful! You can now log in.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
