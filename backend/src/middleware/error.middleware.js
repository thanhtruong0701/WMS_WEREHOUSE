const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        user: req.user?.username,
    });

    if (err.code === '23505') {
        return res.status(409).json({
            success: false,
            message: 'Dữ liệu đã tồn tại (duplicate key)',
            detail: err.detail,
        });
    }

    if (err.code === '23503') {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu tham chiếu không tồn tại (foreign key violation)',
        });
    }

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

const notFound = (req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
};

module.exports = { errorHandler, notFound };
