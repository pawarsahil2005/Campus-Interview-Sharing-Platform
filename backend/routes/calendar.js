const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, isAdmin } = require('../middleware/auth');
const CampusDrive = require('../models/CampusDrive');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get all active campus drives
// @route   GET /api/calendar
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { month, year, upcoming } = req.query;

        let query = { isActive: true };

        if (upcoming === 'true') {
            query.driveDate = { $gte: new Date() };
        } else if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            query.driveDate = { $gte: startDate, $lte: endDate };
        }

        const drives = await CampusDrive.find(query)
            .sort({ driveDate: 1 })
            .populate('createdBy', 'name');

        res.json({ success: true, count: drives.length, drives });
    } catch (error) {
        console.error('Get calendar error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Get single drive
// @route   GET /api/calendar/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const drive = await CampusDrive.findById(req.params.id).populate('createdBy', 'name');
        if (!drive) {
            return res.status(404).json({ success: false, message: 'Drive not found' });
        }
        res.json({ success: true, drive });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Create campus drive (Admin only)
// @route   POST /api/calendar
// @access  Private (Admin)
router.post('/', protect, isAdmin, [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('jobRole').trim().notEmpty().withMessage('Job role is required'),
    body('driveDate').notEmpty().isISO8601().withMessage('Valid drive date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const drive = await CampusDrive.create({
            ...req.body,
            createdBy: req.user.id
        });

        // Notify all students about new campus drive
        const students = await User.find({ role: { $ne: 'admin' } }, '_id');
        const notifications = students.map(s => ({
            user: s._id,
            type: 'campus_drive',
            title: 'New Campus Drive',
            message: `${req.body.companyName} is visiting for ${req.body.jobRole} on ${new Date(req.body.driveDate).toLocaleDateString()}`,
            link: `/calendar`,
            relatedId: drive._id
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.status(201).json({ success: true, drive });
    } catch (error) {
        console.error('Create drive error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Update campus drive (Admin only)
// @route   PUT /api/calendar/:id
// @access  Private (Admin)
router.put('/:id', protect, isAdmin, async (req, res) => {
    try {
        const drive = await CampusDrive.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!drive) {
            return res.status(404).json({ success: false, message: 'Drive not found' });
        }

        res.json({ success: true, drive });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Delete campus drive (Admin only)
// @route   DELETE /api/calendar/:id
// @access  Private (Admin)
router.delete('/:id', protect, isAdmin, async (req, res) => {
    try {
        const drive = await CampusDrive.findByIdAndDelete(req.params.id);

        if (!drive) {
            return res.status(404).json({ success: false, message: 'Drive not found' });
        }

        res.json({ success: true, message: 'Drive deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
