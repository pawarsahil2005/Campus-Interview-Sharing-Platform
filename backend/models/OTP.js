const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: ['registration', 'password-reset'],
        default: 'registration'
    },
    verified: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for quick lookup
otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model('OTP', otpSchema);
