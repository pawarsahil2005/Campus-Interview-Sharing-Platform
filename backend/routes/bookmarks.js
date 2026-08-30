const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Experience = require('../models/Experience');

// @desc    Get user's bookmarks
// @route   GET /api/bookmarks
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('bookmarkedExperiences', 'companyName jobRole difficulty experienceType interviewDate views');

        res.json({
            success: true,
            experiences: user.bookmarkedExperiences || [],
            questions: user.bookmarkedQuestions || []
        });
    } catch (error) {
        console.error('Get bookmarks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Toggle bookmark on experience
// @route   POST /api/bookmarks/experience/:id
// @access  Private
router.post('/experience/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const expId = req.params.id;

        const index = user.bookmarkedExperiences.findIndex(id => id.toString() === expId);
        let bookmarked;

        if (index > -1) {
            user.bookmarkedExperiences.splice(index, 1);
            bookmarked = false;
        } else {
            // Verify experience exists
            const exp = await Experience.findById(expId);
            if (!exp) {
                return res.status(404).json({ success: false, message: 'Experience not found' });
            }
            user.bookmarkedExperiences.push(expId);
            bookmarked = true;
        }

        await user.save();
        res.json({ success: true, bookmarked });
    } catch (error) {
        console.error('Toggle bookmark error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Toggle bookmark on question
// @route   POST /api/bookmarks/question
// @access  Private
router.post('/question', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { experienceId, roundIndex, questionIndex, questionText } = req.body;

        const existing = user.bookmarkedQuestions.findIndex(q =>
            q.experienceId.toString() === experienceId &&
            q.roundIndex === roundIndex &&
            q.questionIndex === questionIndex
        );

        let bookmarked;
        if (existing > -1) {
            user.bookmarkedQuestions.splice(existing, 1);
            bookmarked = false;
        } else {
            user.bookmarkedQuestions.push({ experienceId, roundIndex, questionIndex, questionText });
            bookmarked = true;
        }

        await user.save();
        res.json({ success: true, bookmarked });
    } catch (error) {
        console.error('Toggle question bookmark error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @desc    Check if experience is bookmarked
// @route   GET /api/bookmarks/experience/:id/check
// @access  Private
router.get('/experience/:id/check', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const bookmarked = user.bookmarkedExperiences.some(id => id.toString() === req.params.id);
        res.json({ success: true, bookmarked });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
