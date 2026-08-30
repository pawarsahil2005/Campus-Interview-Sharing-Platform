const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, isFinalYear } = require('../middleware/auth');
const {
    createExperience,
    getExperiences,
    getExperience,
    getMyExperiences,
    updateExperience,
    deleteExperience,
    getCompanies,
    getJobRoles,
    getYears,
    getQuestions,
    getAnswers,
    submitAnswer,
    upvoteAnswer,
    getCompanyStats
} = require('../controllers/experienceController');

// Validation rules for creating experience
const experienceValidation = [
    body('companyName')
        .trim()
        .notEmpty().withMessage('Company name is required'),
    body('jobRole')
        .trim()
        .notEmpty().withMessage('Job role is required'),
    body('interviewDate')
        .notEmpty().withMessage('Interview date is required')
        .isISO8601().withMessage('Invalid date format'),
    body('difficulty')
        .notEmpty().withMessage('Difficulty level is required')
        .isIn(['Easy', 'Medium', 'Hard']).withMessage('Invalid difficulty level'),
    body('experienceType')
        .notEmpty().withMessage('Experience type is required')
        .isIn(['Positive', 'Neutral', 'Negative']).withMessage('Invalid experience type')
];

// Protected routes for general user access
router.get('/', protect, getExperiences);
router.get('/companies', protect, getCompanies);
router.get('/jobroles', protect, getJobRoles);
router.get('/years', protect, getYears);
router.get('/questions', protect, getQuestions);
router.get('/company/:name/stats', protect, getCompanyStats);

// Protected routes
router.get('/my', protect, getMyExperiences);
router.post('/', protect, isFinalYear, experienceValidation, createExperience);
router.get('/:id', protect, getExperience);
router.put('/:id', protect, updateExperience);
router.delete('/:id', protect, deleteExperience);

// Answer routes (must come after /:id to avoid conflict)
router.get('/:id/answers', protect, getAnswers);
router.post('/:id/answers', protect, [
    body('answerText').trim().notEmpty().withMessage('Answer text is required').isLength({ max: 3000 }).withMessage('Answer cannot exceed 3000 characters'),
    body('questionText').trim().notEmpty().withMessage('Question text is required'),
    body('questionIndex').isInt({ min: 0 }).withMessage('Question index is required')
], submitAnswer);
router.put('/:id/answers/:answerId/upvote', protect, upvoteAnswer);

module.exports = router;
