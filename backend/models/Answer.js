const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    // The question text this answers
    questionText: {
        type: String,
        required: true,
        trim: true
    },
    // Which experience + round this question belongs to (for context)
    experienceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Experience',
        required: true
    },
    roundIndex: {
        type: Number,    // -1 means top-level (not inside a round)
        default: -1
    },
    questionIndex: {
        type: Number,
        required: true
    },
    // The answer content
    answerText: {
        type: String,
        required: true,
        trim: true,
        maxlength: [3000, 'Answer cannot exceed 3000 characters']
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
    upvotes: {
        type: Number,
        default: 0
    },
    upvotedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Answer', answerSchema);
