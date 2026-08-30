const mongoose = require('mongoose');

/**
 * Returns 503 with a dbConnecting flag when MongoDB is not ready.
 * Attach this before any route that queries the database.
 */
module.exports = (req, res, next) => {
    if (mongoose.connection.readyState === 1) return next(); // 1 = connected
    return res.status(503).json({
        success: false,
        message: 'Database is connecting. Please wait a moment and try again.',
        dbConnecting: true,
        retryAfter: 10
    });
};
