const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const {
    getAllExperiences,
    getPendingExperiences,
    approveExperience,
    rejectExperience,
    deleteExperience,
    deleteExperienceQuestion,
    getAllUsers,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    getStats,
    getCompanies,
    addCompany,
    deleteCompany
} = require('../controllers/adminController');

// All admin routes are protected
router.use(protect);
router.use(isAdmin);

// Experience management
router.get('/experiences', getAllExperiences);
router.get('/experiences/pending', getPendingExperiences);
router.put('/experiences/:id/approve', approveExperience);
router.put('/experiences/:id/reject', rejectExperience);
router.delete('/experiences/:id', deleteExperience);
router.delete('/experiences/:id/questions', deleteExperienceQuestion);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/toggle', toggleUserStatus);
router.delete('/users/:id', deleteUser);

// Statistics
router.get('/stats', getStats);

// Company management
router.get('/companies', getCompanies);
router.post('/companies', addCompany);
router.delete('/companies/:id', deleteCompany);

module.exports = router;
