const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });

        res.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, notification });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, isRead: false },
            { isRead: true }
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Clear all notifications
// @route   DELETE /api/notifications
// @access  Private
router.delete('/', protect, async (req, res) => {
    try {
        await Notification.deleteMany({ user: req.user.id });
        res.json({ success: true, message: 'All notifications cleared' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

// Helper function to create notifications (exported for use elsewhere)
module.exports.createNotification = async (userId, type, title, message, link = null, relatedId = null) => {
    try {
        await Notification.create({
            user: userId,
            type,
            title,
            message,
            link,
            relatedId
        });
    } catch (error) {
        console.error('Create notification error:', error);
    }
};
