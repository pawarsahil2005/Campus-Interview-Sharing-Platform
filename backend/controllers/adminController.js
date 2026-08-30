const Experience = require('../models/Experience');
const User = require('../models/User');
const Company = require('../models/Company');

// @desc    Get all experiences (including pending)
// @route   GET /api/admin/experiences
// @access  Private (Admin)
exports.getAllExperiences = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (page - 1) * limit;

        let query = {};

        // Status filter
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Company filter
        if (req.query.company) {
            query.companyName = new RegExp(req.query.company, 'i');
        }

        const total = await Experience.countDocuments(query);
        const experiences = await Experience.find(query)
            .populate('submittedBy', 'name email branch year rollNumber')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: experiences.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            experiences
        });
    } catch (error) {
        console.error('Get all experiences error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get pending experiences
// @route   GET /api/admin/experiences/pending
// @access  Private (Admin)
exports.getPendingExperiences = async (req, res) => {
    try {
        const experiences = await Experience.find({ status: 'pending' })
            .populate('submittedBy', 'name email branch year rollNumber')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: experiences.length,
            experiences
        });
    } catch (error) {
        console.error('Get pending experiences error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Approve experience
// @route   PUT /api/admin/experiences/:id/approve
// @access  Private (Admin)
exports.approveExperience = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id);

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Experience not found'
            });
        }

        experience.status = 'approved';
        experience.approvedAt = Date.now();
        experience.approvedBy = req.user.id;
        await experience.save();

        res.status(200).json({
            success: true,
            message: 'Experience approved successfully',
            experience
        });
    } catch (error) {
        console.error('Approve experience error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Reject experience
// @route   PUT /api/admin/experiences/:id/reject
// @access  Private (Admin)
exports.rejectExperience = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id);

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Experience not found'
            });
        }

        experience.status = 'rejected';
        experience.rejectionReason = req.body.reason || 'Does not meet guidelines';
        await experience.save();

        res.status(200).json({
            success: true,
            message: 'Experience rejected',
            experience
        });
    } catch (error) {
        console.error('Reject experience error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete experience (Admin)
// @route   DELETE /api/admin/experiences/:id
// @access  Private (Admin)
exports.deleteExperience = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id);

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Experience not found'
            });
        }

        // Remove from all users' bookmarks
        await User.updateMany(
            {},
            {
                $pull: {
                    bookmarkedExperiences: req.params.id,
                    bookmarkedQuestions: { experienceId: req.params.id }
                }
            }
        );

        await experience.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Experience deleted successfully'
        });
    } catch (error) {
        console.error('Delete experience error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete question from experience (Admin)
// @route   DELETE /api/admin/experiences/:id/questions
// @access  Private (Admin)
exports.deleteExperienceQuestion = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id);
        if (!experience) {
            return res.status(404).json({ success: false, message: 'Experience not found' });
        }

        const { roundIndex, questionIndex } = req.body;
        let deletedQuestionText = '';

        if (roundIndex !== undefined && roundIndex !== null) {
            // It's a round question
            if (!experience.rounds[roundIndex] || !experience.rounds[roundIndex].questions[questionIndex]) {
                return res.status(404).json({ success: false, message: 'Question not found in round' });
            }
            deletedQuestionText = experience.rounds[roundIndex].questions[questionIndex];

            // Remove the question
            experience.rounds[roundIndex].questions.splice(questionIndex, 1);

            // Adjust questionTags for remaining questions
            if (experience.rounds[roundIndex].questionTags) {
                experience.rounds[roundIndex].questionTags = experience.rounds[roundIndex].questionTags
                    .filter(t => t.questionIndex !== questionIndex)
                    .map(t => {
                        if (t.questionIndex > questionIndex) {
                            t.questionIndex -= 1;
                        }
                        return t;
                    });
            }
        } else {
            // It's a general question
            if (!experience.questions[questionIndex]) {
                return res.status(404).json({ success: false, message: 'General question not found' });
            }
            deletedQuestionText = experience.questions[questionIndex];

            // Remove the question
            experience.questions.splice(questionIndex, 1);

            // Adjust tags
            if (experience.questionTags) {
                experience.questionTags = experience.questionTags
                    .filter(t => t.questionIndex !== questionIndex)
                    .map(t => {
                        if (t.questionIndex > questionIndex) {
                            t.questionIndex -= 1;
                        }
                        return t;
                    });
            }
        }

        await experience.save();

        // Remove bookmarks that link to this specific question using the exact text
        await User.updateMany(
            {},
            { $pull: { bookmarkedQuestions: { experienceId: req.params.id, questionText: deletedQuestionText } } }
        );

        res.status(200).json({
            success: true,
            message: 'Question deleted successfully',
            experience
        });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (page - 1) * limit;

        let query = {};

        // Role filter
        if (req.query.role) {
            query.role = req.query.role;
        }

        // Branch filter
        if (req.query.branch) {
            query.branch = req.query.branch;
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['junior', 'finalyear', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User role updated successfully',
            user
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/toggle
// @access  Private (Admin)
exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            user
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete admin user'
            });
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getStats = async (req, res) => {
    try {
        // Total counts
        const totalUsers = await User.countDocuments();
        const totalExperiences = await Experience.countDocuments();
        const approvedExperiences = await Experience.countDocuments({ status: 'approved' });
        const pendingExperiences = await Experience.countDocuments({ status: 'pending' });
        const rejectedExperiences = await Experience.countDocuments({ status: 'rejected' });

        // User counts by role
        const juniorCount = await User.countDocuments({ role: 'junior' });
        const finalYearCount = await User.countDocuments({ role: 'finalyear' });

        // Experiences by company
        const experiencesByCompany = await Experience.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: '$companyName', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Experiences by job role
        const experiencesByRole = await Experience.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: '$jobRole', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Experiences by difficulty
        const experiencesByDifficulty = await Experience.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: '$difficulty', count: { $sum: 1 } } }
        ]);

        // Experiences by experience type
        const experiencesByType = await Experience.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: '$experienceType', count: { $sum: 1 } } }
        ]);

        // Recent experiences
        const recentExperiences = await Experience.find()
            .populate('submittedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        // Recent users
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalExperiences,
                approvedExperiences,
                pendingExperiences,
                rejectedExperiences,
                juniorCount,
                finalYearCount,
                experiencesByCompany,
                experiencesByRole,
                experiencesByDifficulty,
                experiencesByType,
                recentExperiences,
                recentUsers
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get all companies
// @route   GET /api/admin/companies
// @access  Private (Admin)
exports.getCompanies = async (req, res) => {
    try {
        const companies = await Company.find().sort({ companyName: 1 });

        res.status(200).json({
            success: true,
            count: companies.length,
            companies
        });
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Add company
// @route   POST /api/admin/companies
// @access  Private (Admin)
exports.addCompany = async (req, res) => {
    try {
        const { companyName, sector, website, description, averagePackage } = req.body;

        const existingCompany = await Company.findOne({ companyName: new RegExp(`^${companyName}$`, 'i') });
        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'Company already exists'
            });
        }

        const company = await Company.create({
            companyName,
            sector,
            website,
            description,
            averagePackage
        });

        res.status(201).json({
            success: true,
            message: 'Company added successfully',
            company
        });
    } catch (error) {
        console.error('Add company error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete company
// @route   DELETE /api/admin/companies/:id
// @access  Private (Admin)
exports.deleteCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        await company.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Company deleted successfully'
        });
    } catch (error) {
        console.error('Delete company error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
