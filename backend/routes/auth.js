const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
    register,
    login,
    getMe,
    updatePassword,
    updateProfile,
    sendOTP,
    verifyOTP
} = require('../controllers/authController');

// Validation rules
const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('branch')
        .optional()
        .isIn(['Computer Engineering', 'IT', 'ENTC', 'Mechanical', 'Civil', 'AI & ML', 'Data Science', 'Other'])
        .withMessage('Invalid branch'),
    body('year')
        .optional()
        .isIn(['FY', 'SY', 'TY', 'Final Year'])
        .withMessage('Invalid year')
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),
    body('password')
        .notEmpty().withMessage('Password is required')
];

// OTP Routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/updateprofile', protect, updateProfile);

module.exports = router;
