const mongoose = require('mongoose');

const campusDriveSchema = new mongoose.Schema({
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
    driveDate: {
        type: Date,
        required: [true, 'Drive date is required']
    },
    registrationDeadline: {
        type: Date
    },
    eligibleBranches: [{
        type: String,
        enum: ['Computer Engineering', 'IT', 'ENTC', 'Mechanical', 'Civil', 'AI & ML', 'Data Science', 'Other', 'All']
    }],
    eligibleYears: [{
        type: String,
        enum: ['FY', 'SY', 'TY', 'Final Year']
    }],
    minCGPA: {
        type: Number,
        min: 0,
        max: 10
    },
    packageOffered: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    registrationLink: {
        type: String,
        trim: true
    },
    venue: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for date queries
campusDriveSchema.index({ driveDate: 1, isActive: 1 });

module.exports = mongoose.model('CampusDrive', campusDriveSchema);
