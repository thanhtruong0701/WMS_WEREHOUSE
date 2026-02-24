const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username và password là bắt buộc' });
        }

        const result = await query(
            'SELECT id, username, email, full_name, role, password_hash, is_active FROM users WHERE (username=$1 OR email=$1) AND deleted_at IS NULL',
            [username]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        const user = result.rows[0];

        // 1. Check is_active first
        if (!user.is_active) {
            return res.status(401).json({ success: false, message: 'Tài khoản đã bị vô hiệu hóa' });
        }

        // 2. Compare password with bcrypt
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
        }

        const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only_please_set_in_vercel';

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                fullName: req.user.full_name,
                role: req.user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const result = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
        const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, req.user.id]);

        res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        next(error);
    }
};

module.exports = { login, getProfile, changePassword };
