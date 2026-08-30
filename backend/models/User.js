const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
            'Please provide a valid email'
        ]
    },
    rollNumber: {
        type: String,
        trim: true,
        sparse: true
    },
    branch: {
        type: String,
        enum: ['Computer Engineering', 'IT', 'ENTC', 'Mechanical', 'Civil', 'AI & ML', 'Data Science', 'Other'],
        default: 'Computer Engineering'
    },
    year: {
        type: String,
        enum: ['FY', 'SY', 'TY', 'Final Year'],
        default: 'Final Year'
    },
    role: {
        type: String,
        enum: ['junior', 'finalyear', 'admin'],
        default: 'junior'
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    bookmarkedExperiences: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Experience'
    }],
    bookmarkedQuestions: [{
        experienceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Experience' },
        roundIndex: { type: Number },
        questionIndex: { type: Number },
        questionText: { type: String }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
