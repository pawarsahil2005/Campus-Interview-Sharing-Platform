const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        unique: true,
        trim: true
    },
    sector: {
        type: String,
        enum: ['IT', 'Finance', 'Consulting', 'Manufacturing', 'Healthcare', 'E-commerce', 'Automobile', 'Other'],
        default: 'IT'
    },
    logoUrl: {
        type: String
    },
    website: {
        type: String
    },
    description: {
        type: String
    },
    averagePackage: {
        type: String
    },
    totalExperiences: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Company', companySchema);
