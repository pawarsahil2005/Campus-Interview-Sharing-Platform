const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
    roundType: {
        type: String,
        enum: ['Online Test', 'Technical Round', 'HR Round', 'Group Discussion', 'Coding Round', 'Case Study', 'Other'],
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    questions: [{
        type: String
    }],
    questionTags: [{
        questionIndex: Number,
        tags: [{ type: String, enum: ['DSA', 'System Design', 'DBMS', 'OOPs', 'OS', 'Operating Systems', 'CN', 'Computer Networks', 'HR', 'HR Interview', 'Puzzles', 'Coding', 'Web Development', 'Backend Development', 'Machine Learning', 'Online Assessment', 'Technical Interview', 'Aptitude', 'Logical Reasoning', 'Behavioural', 'Project', 'Project Discussion', 'Other'] }]
    }],
    duration: String,
    tips: String
});

const experienceSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true
    },
    jobRole: {
        type: String,
        required: [true, 'Job role is required'],
        trim: true
    },
    interviewDate: {
        type: Date,
        required: [true, 'Interview date is required']
    },
    interviewYear: {
        type: Number,
        required: true
    },
    rounds: [roundSchema],
    questions: [{
        type: String
    }],
    questionTags: [{
        questionIndex: Number,
        tags: [{ type: String, enum: ['DSA', 'System Design', 'DBMS', 'OOPs', 'OS', 'Operating Systems', 'CN', 'Computer Networks', 'HR', 'HR Interview', 'Puzzles', 'Coding', 'Web Development', 'Backend Development', 'Machine Learning', 'Online Assessment', 'Technical Interview', 'Aptitude', 'Logical Reasoning', 'Behavioural', 'Project', 'Project Discussion', 'Other'] }]
    }],
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: [true, 'Difficulty level is required']
    },
    tips: {
        type: String,
        maxlength: [2000, 'Tips cannot exceed 2000 characters']
    },
    experienceType: {
        type: String,
        enum: ['Positive', 'Neutral', 'Negative'],
        required: [true, 'Experience type is required']
    },
    packageOffered: {
        type: String,
        trim: true
    },
    selectionStatus: {
        type: String,
        enum: ['Selected', 'Not Selected', 'Waiting'],
        default: 'Waiting'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: {
        type: Date
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Index for search functionality
experienceSchema.index({ companyName: 'text', jobRole: 'text', questions: 'text' });

// Virtual for formatted date
experienceSchema.virtual('formattedDate').get(function() {
    return this.interviewDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Static method to get experiences by company
experienceSchema.statics.getByCompany = function(companyName) {
    return this.find({ companyName: new RegExp(companyName, 'i'), status: 'approved' });
};

module.exports = mongoose.model('Experience', experienceSchema);
