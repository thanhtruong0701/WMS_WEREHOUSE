const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await query(
            'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL',
            [decoded.userId]
        );

        if (!result.rows.length || !result.rows[0].is_active) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }
        next(error);
    }
};

const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${roles.join(', ')}`,
            });
        }
        next();
    };
};

module.exports = { verifyToken, checkRole };
