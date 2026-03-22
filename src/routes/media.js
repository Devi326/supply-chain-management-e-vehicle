const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Media = require('../models/Media');
const { protect, requireLevel } = require('../middleware/auth');
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = process.env.UPLOAD_DIR || 'uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// @route   GET /api/media
router.get('/', protect, requireLevel(2), async (req, res) => {
    try {
        const media = await Media.find().sort({ createdAt: -1 });
        res.json({ success: true, data: media.map(m => ({ ...m.toObject(), id: m._id })) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/media/upload
router.post('/upload', protect, requireLevel(2), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const media = new Media({
            file_name: req.file.filename,
            file_type: req.file.mimetype
        });

        await media.save();
        res.status(201).json({ success: true, data: media });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   DELETE /api/media/:id
router.delete('/:id', [
    protect,
    requireLevel(2),
    param('id').isMongoId().withMessage('Invalid media ID'),
    validate
], async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) return res.status(404).json({ success: false, message: 'Media not found' });

        const filePath = path.join(process.env.UPLOAD_DIR || 'uploads', media.file_name);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await Media.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Media deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
