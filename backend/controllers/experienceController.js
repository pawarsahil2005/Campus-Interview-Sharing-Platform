const Experience = require('../models/Experience');
const Company = require('../models/Company');
const Answer = require('../models/Answer');
const { validationResult } = require('express-validator');

// @desc    Create new experience
// @route   POST /api/experiences
// @access  Private (Final Year / Admin)
exports.createExperience = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            companyName,
            jobRole,
            interviewDate,
            rounds,
            questions,
            difficulty,
            tips,
            experienceType,
            packageOffered,
            selectionStatus,
            isAnonymous
        } = req.body;

        // Extract year from interview date
        const interviewYear = new Date(interviewDate).getFullYear();

        // Create experience
        const experience = await Experience.create({
            companyName,
            jobRole,
            interviewDate,
            interviewYear,
            rounds: rounds || [],
            questions: questions || [],
            questionTags: req.body.questionTags || [],
            difficulty,
            tips,
            experienceType,
            packageOffered,
            selectionStatus,
            isAnonymous: isAnonymous || false,
            submittedBy: req.user.id,
            status: 'pending'
        });

        // Update or create company
        let company = await Company.findOne({ companyName: new RegExp(`^${companyName}$`, 'i') });
        if (company) {
            company.totalExperiences += 1;
            await company.save();
        } else {
            await Company.create({
                companyName,
                totalExperiences: 1
            });
        }

        res.status(201).json({
            success: true,
            message: 'Experience submitted successfully! It will be visible after admin approval.',
            experience
        });
    } catch (error) {
        console.error('Create experience error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating experience'
        });
    }
};

// @desc    Get all approved experiences (with filters and pagination)
// @route   GET /api/experiences
// @access  Public
exports.getExperiences = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // Build query
        let query = { status: 'approved' };

        // Company filter
        if (req.query.company) {
            query.companyName = new RegExp(req.query.company, 'i');
        }

        // Job role filter
        if (req.query.jobRole) {
            query.jobRole = new RegExp(req.query.jobRole, 'i');
        }

        // Difficulty filter
        if (req.query.difficulty) {
            query.difficulty = req.query.difficulty;
        }

        // Year filter
        if (req.query.year) {
            query.interviewYear = parseInt(req.query.year, 10);
        }

        // Experience type filter
        if (req.query.experienceType) {
            query.experienceType = req.query.experienceType;
        }

        // Search query
        if (req.query.search) {
            query.$text = { $search: req.query.search };
        }

        const total = await Experience.countDocuments(query);
        const experiences = await Experience.find(query)
            .populate('submittedBy', 'name branch year')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Mask submitter info for anonymous posts
        const processedExperiences = experiences.map(exp => {
            const expObj = exp.toObject();
            if (expObj.isAnonymous) {
                expObj.submittedBy = { name: 'Anonymous', branch: 'N/A', year: 'N/A' };
            }
            return expObj;
        });

        res.status(200).json({
            success: true,
            count: experiences.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            experiences: processedExperiences
        });
    } catch (error) {
        console.error('Get experiences error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching experiences'
        });
    }
};

// @desc    Get single experience
// @route   GET /api/experiences/:id
// @access  Public
exports.getExperience = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id)
            .populate('submittedBy', 'name branch year');

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Experience not found'
            });
        }

        // Only show approved experiences to non-admin users
        if (experience.status !== 'approved') {
            const ownerId = experience.submittedBy?._id?.toString() || experience.submittedBy?.toString();
            if (!req.user || (req.user.role !== 'admin' && ownerId !== req.user.id)) {
                return res.status(404).json({
                    success: false,
                    message: 'Experience not found'
                });
            }
        }

        // Increment view count
        experience.views += 1;
        await experience.save();

        // Mask submitter info for anonymous posts
        const expObj = experience.toObject();
        if (expObj.isAnonymous && (!req.user || req.user.role !== 'admin')) {
            expObj.submittedBy = { name: 'Anonymous', branch: 'N/A', year: 'N/A' };
        }

        res.status(200).json({
            success: true,
            experience: expObj
        });
    } catch (error) {
        console.error('Get experience error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching experience'
        });
    }
};

// @desc    Get my experiences (submitted by current user)
// @route   GET /api/experiences/my
// @access  Private
exports.getMyExperiences = async (req, res) => {
    try {
        const experiences = await Experience.find({ submittedBy: req.user.id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: experiences.length,
            experiences
        });
    } catch (error) {
        console.error('Get my experiences error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching your experiences'
        });
    }
};

// @desc    Update experience
// @route   PUT /api/experiences/:id
// @access  Private (Owner or Admin)
exports.updateExperience = async (req, res) => {
    try {
        let experience = await Experience.findById(req.params.id);

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Experience not found'
            });
        }

        // Check ownership or admin
        if (experience.submittedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this experience'
            });
        }

        // If user updates, reset to pending
        if (req.user.role !== 'admin') {
            req.body.status = 'pending';
        }

        experience = await Experience.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            message: 'Experience updated successfully',
            experience
        });
    } catch (error) {
        console.error('Update experience error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating experience'
        });
    }
};

// @desc    Delete experience
// @route   DELETE /api/experiences/:id
// @access  Private (Owner or Admin)
exports.deleteExperience = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id);

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Experience not found'
            });
        }

        // Check ownership or admin
        if (experience.submittedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this experience'
            });
        }

        await experience.deleteOne();

        // Update company experience count
        const company = await Company.findOne({ companyName: new RegExp(`^${experience.companyName}$`, 'i') });
        if (company && company.totalExperiences > 0) {
            company.totalExperiences -= 1;
            await company.save();
        }

        res.status(200).json({
            success: true,
            message: 'Experience deleted successfully'
        });
    } catch (error) {
        console.error('Delete experience error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting experience'
        });
    }
};

// @desc    Get companies list
// @route   GET /api/experiences/companies
// @access  Public
exports.getCompanies = async (req, res) => {
    try {
        const companies = await Experience.distinct('companyName', { status: 'approved' });

        res.status(200).json({
            success: true,
            count: companies.length,
            companies: companies.sort()
        });
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching companies'
        });
    }
};

// @desc    Get job roles list
// @route   GET /api/experiences/jobroles
// @access  Public
exports.getJobRoles = async (req, res) => {
    try {
        const jobRoles = await Experience.distinct('jobRole', { status: 'approved' });

        res.status(200).json({
            success: true,
            count: jobRoles.length,
            jobRoles: jobRoles.sort()
        });
    } catch (error) {
        console.error('Get job roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching job roles'
        });
    }
};

// @desc    Get years list
// @route   GET /api/experiences/years
// @access  Public
exports.getYears = async (req, res) => {
    try {
        const years = await Experience.distinct('interviewYear', { status: 'approved' });

        res.status(200).json({
            success: true,
            count: years.length,
            years: years.sort((a, b) => b - a)
        });
    } catch (error) {
        console.error('Get years error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching years'
        });
    }
};

// @desc    Get all questions across approved experiences
// @route   GET /api/experiences/questions
// @access  Public
exports.getQuestions = async (req, res) => {
    try {
        const query = { status: 'approved' };
        if (req.query.company) {
            query.companyName = new RegExp(req.query.company, 'i');
        }

        const experiences = await Experience.find(query, 'companyName jobRole rounds questions');

        const questionList = [];

        for (const exp of experiences) {
            // Round-level questions only (exclude top-level general questions from Questions Bank)
            if (exp.rounds && exp.rounds.length > 0) {
                exp.rounds.forEach((round, roundIdx) => {
                    if (round.questions && round.questions.length > 0) {
                        round.questions.forEach((q, qIdx) => {
                            if (q && q.trim()) {
                                const tagEntry = (round.questionTags || []).find(t => t.questionIndex === qIdx);
                                questionList.push({
                                    text: q.trim(),
                                    companyName: exp.companyName,
                                    jobRole: exp.jobRole,
                                    roundType: round.roundType || 'Technical Round',
                                    roundName: round.roundName || `Round ${roundIdx + 1}`,
                                    experienceId: exp._id,
                                    roundIndex: roundIdx,
                                    questionIndex: qIdx,
                                    tags: tagEntry?.tags || []
                                });
                            }
                        });
                    }
                });
            }
            // Note: Top-level exp.questions are NOT included in Questions Bank
            // They appear only in the individual experience detail page
        }

        // Filter by roundType if requested (accept short aliases from the UI)
        let filtered = questionList;
        if (req.query.roundType) {
            const requested = req.query.roundType.toLowerCase();
            const aliases = {
                technical: ['technical', 'technical round', 'coding round'],
                hr: ['hr', 'hr round'],
                aptitude: ['aptitude', 'online test'],
                'group discussion': ['group discussion'],
                managerial: ['managerial', 'case study']
            };
            const matchValues = aliases[requested] || [requested];
            filtered = questionList.filter(q =>
                matchValues.includes(q.roundType.toLowerCase())
            );
        }

        // Text search
        if (req.query.search) {
            const s = req.query.search.toLowerCase();
            filtered = filtered.filter(q => q.text.toLowerCase().includes(s));
        }

        res.status(200).json({
            success: true,
            count: filtered.length,
            questions: filtered
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching questions'
        });
    }
};

// @desc    Get answers for a question (keyed by experienceId + roundIndex + questionIndex)
// @route   GET /api/experiences/:id/answers?roundIndex=&questionIndex=
// @access  Public
exports.getAnswers = async (req, res) => {
    try {
        const { roundIndex, questionIndex } = req.query;
        const filter = {
            experienceId: req.params.id,
            questionIndex: parseInt(questionIndex, 10)
        };
        if (roundIndex !== undefined) {
            filter.roundIndex = parseInt(roundIndex, 10);
        }

        const answers = await Answer.find(filter)
            .populate('submittedBy', 'name branch year')
            .sort({ upvotes: -1, createdAt: -1 });

        const result = answers.map(a => {
            const obj = a.toObject();
            if (obj.isAnonymous) obj.submittedBy = { name: 'Anonymous' };
            return obj;
        });

        res.status(200).json({ success: true, count: result.length, answers: result });
    } catch (error) {
        console.error('Get answers error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching answers' });
    }
};

// @desc    Submit an answer for a question
// @route   POST /api/experiences/:id/answers
// @access  Private
exports.submitAnswer = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const experience = await Experience.findById(req.params.id);
        if (!experience || experience.status !== 'approved') {
            return res.status(404).json({ success: false, message: 'Experience not found' });
        }

        const { questionText, answerText, roundIndex, questionIndex, isAnonymous } = req.body;

        const answer = await Answer.create({
            questionText,
            answerText,
            experienceId: req.params.id,
            roundIndex: roundIndex !== undefined ? parseInt(roundIndex, 10) : -1,
            questionIndex: parseInt(questionIndex, 10),
            submittedBy: req.user.id,
            isAnonymous: isAnonymous || false
        });

        await answer.populate('submittedBy', 'name branch year');
        const obj = answer.toObject();
        if (obj.isAnonymous) obj.submittedBy = { name: 'Anonymous' };

        res.status(201).json({ success: true, answer: obj });
    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({ success: false, message: 'Server error while submitting answer' });
    }
};

// @desc    Upvote / un-upvote an answer
// @route   PUT /api/experiences/:id/answers/:answerId/upvote
// @access  Private
exports.upvoteAnswer = async (req, res) => {
    try {
        const answer = await Answer.findById(req.params.answerId);
        if (!answer) {
            return res.status(404).json({ success: false, message: 'Answer not found' });
        }

        const userId = req.user.id;
        const alreadyUpvoted = answer.upvotedBy.some(id => id.toString() === userId);

        if (alreadyUpvoted) {
            answer.upvotedBy = answer.upvotedBy.filter(id => id.toString() !== userId);
            answer.upvotes = Math.max(0, answer.upvotes - 1);
        } else {
            answer.upvotedBy.push(userId);
            answer.upvotes += 1;
        }

        await answer.save();

        res.status(200).json({
            success: true,
            upvotes: answer.upvotes,
            upvoted: !alreadyUpvoted
        });
    } catch (error) {
        console.error('Upvote error:', error);
        res.status(500).json({ success: false, message: 'Server error while upvoting' });
    }
};

// @desc    Get company statistics
// @route   GET /api/experiences/company/:name/stats
// @access  Public
exports.getCompanyStats = async (req, res) => {
    try {
        const companyName = decodeURIComponent(req.params.name);
        const query = { status: 'approved', companyName: new RegExp(`^${companyName}$`, 'i') };

        const experiences = await Experience.find(query)
            .populate('submittedBy', 'name branch year')
            .sort({ createdAt: -1 });

        if (experiences.length === 0) {
            return res.status(404).json({ success: false, message: 'No experiences found for this company' });
        }

        // Compute stats
        const totalExperiences = experiences.length;
        const difficultyCount = { Easy: 0, Medium: 0, Hard: 0 };
        const typeCount = { Positive: 0, Neutral: 0, Negative: 0 };
        const selectionCount = { Selected: 0, 'Not Selected': 0, Waiting: 0 };
        const roundTypes = {};
        const jobRoles = new Set();
        const years = new Set();
        let totalViews = 0;
        const packages = [];

        for (const exp of experiences) {
            difficultyCount[exp.difficulty] = (difficultyCount[exp.difficulty] || 0) + 1;
            typeCount[exp.experienceType] = (typeCount[exp.experienceType] || 0) + 1;
            selectionCount[exp.selectionStatus] = (selectionCount[exp.selectionStatus] || 0) + 1;
            totalViews += exp.views || 0;
            jobRoles.add(exp.jobRole);
            years.add(exp.interviewYear);

            if (exp.packageOffered) {
                const num = parseFloat(exp.packageOffered);
                if (!isNaN(num)) packages.push(num);
            }

            if (exp.rounds) {
                for (const round of exp.rounds) {
                    roundTypes[round.roundType] = (roundTypes[round.roundType] || 0) + 1;
                }
            }
        }

        const avgPackage = packages.length > 0 ? (packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(2) : null;
        const successRate = totalExperiences > 0 ? Math.round((selectionCount.Selected / totalExperiences) * 100) : 0;

        // Top questions from this company
        const questions = [];
        for (const exp of experiences) {
            if (exp.rounds) {
                exp.rounds.forEach((round, ri) => {
                    if (round.questions) {
                        round.questions.forEach((q, qi) => {
                            if (q && q.trim()) {
                                questions.push({
                                    text: q.trim(),
                                    roundType: round.roundType,
                                    experienceId: exp._id
                                });
                            }
                        });
                    }
                });
            }
            if (exp.questions) {
                exp.questions.forEach((q, qi) => {
                    if (q && q.trim()) {
                        questions.push({ text: q.trim(), roundType: 'General', experienceId: exp._id });
                    }
                });
            }
        }

        res.json({
            success: true,
            companyName: experiences[0].companyName,
            stats: {
                totalExperiences,
                totalViews,
                successRate,
                avgPackage,
                difficultyCount,
                typeCount,
                selectionCount,
                roundTypes,
                jobRoles: Array.from(jobRoles),
                years: Array.from(years).sort((a, b) => b - a)
            },
            questions: questions.slice(0, 20),
            experiences
        });
    } catch (error) {
        console.error('Get company stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
