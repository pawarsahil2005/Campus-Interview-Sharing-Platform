const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @desc    Send OTP for email verification
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if email is from PCCOE domain
        const pccoeDomainRegex = /@pccoepune\.org$/i;
        if (!pccoeDomainRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Only PCCOE students can register. Please use your @pccoepune.org email.'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Delete any existing OTPs for this email
        await OTP.deleteMany({ email: email.toLowerCase(), purpose: 'registration' });

        // Generate new OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to database
        await OTP.create({
            email: email.toLowerCase(),
            otp,
            purpose: 'registration',
            expiresAt
        });

        // Send OTP email
        const emailResult = await sendOTPEmail(email, otp);

        if (!emailResult.success) {
            // Email failed (SMTP blocked) - in development, return OTP in response
            if (process.env.NODE_ENV !== 'production') {
                console.log(`\n[DEV FALLBACK] OTP for ${email}: ${otp}\n`);
                return res.status(200).json({
                    success: true,
                    message: 'OTP generated (email delivery unavailable in dev mode)',
                    devOtp: otp,       // Only included in development mode
                    development: true
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email. Please try again.'
            });
        }

        res.status(200).json({
            success: true,
            message: emailResult.development
                ? 'OTP generated (check server console)'
                : 'OTP sent to your email. Please check your inbox.',
            development: emailResult.development || false
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while sending OTP'
        });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Find OTP record
        const otpRecord = await OTP.findOne({
            email: email.toLowerCase(),
            purpose: 'registration',
            verified: false
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'OTP not found or expired. Please request a new one.'
            });
        }

        // Check if expired
        if (otpRecord.expiresAt < new Date()) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Check attempts
        if (otpRecord.attempts >= 5) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                success: false,
                message: 'Too many failed attempts. Please request a new OTP.'
            });
        }

        // Verify OTP
        if (otpRecord.otp !== otp) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`
            });
        }

        // Mark as verified
        otpRecord.verified = true;
        await otpRecord.save();

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now complete registration.'
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while verifying OTP'
        });
    }
};

// @desc    Register user (after OTP verification)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email, rollNumber, branch, year, password, role } = req.body;

        // Check if email is from PCCOE domain
        const pccoeDomainRegex = /@pccoepune\.org$/i;
        if (!pccoeDomainRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Only PCCOE students can register. Please use your @pccoepune.org email.'
            });
        }

        // Check if email was verified
        const otpRecord = await OTP.findOne({
            email: email.toLowerCase(),
            purpose: 'registration',
            verified: true
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'Email not verified. Please verify your email with OTP first.'
            });
        }

        // Check if user already exists
        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Determine role based on year
        let userRole = 'junior';
        if (year === 'Final Year' || role === 'finalyear') {
            userRole = 'finalyear';
        }

        // Create user
        user = await User.create({
            name,
            email: email.toLowerCase(),
            rollNumber,
            branch,
            year,
            role: userRole,
            password,
            emailVerified: true
        });

        // Delete the OTP record
        await OTP.deleteOne({ _id: otpRecord._id });

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch,
                year: user.year
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact admin.'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch,
                year: user.year
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch,
                year: user.year,
                rollNumber: user.rollNumber,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        user.password = newPassword;
        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
            token
        });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { name, branch, year } = req.body;

        const fieldsToUpdate = {};
        if (name) fieldsToUpdate.name = name;
        if (branch) fieldsToUpdate.branch = branch;
        if (year) fieldsToUpdate.year = year;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            fieldsToUpdate,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch,
                year: user.year
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
