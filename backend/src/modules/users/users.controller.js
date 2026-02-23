const { query } = require('../../config/database');
const bcrypt = require('bcryptjs');

const getUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const [count, data] = await Promise.all([
            query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL'),
            query('SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
        ]);
        res.json({ success: true, data: data.rows, meta: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) { next(error); }
};

const createUser = async (req, res, next) => {
    try {
        const { username, email, password, full_name, role } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const result = await query(
            'INSERT INTO users (username, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, email, full_name, role, is_active',
            [username, email, hash, full_name, role || 'viewer']
        );
        res.status(201).json({ success: true, message: 'Tạo user thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

const updateUser = async (req, res, next) => {
    try {
        const { full_name, role, is_active } = req.body;
        const result = await query(
            'UPDATE users SET full_name=$1, role=$2, is_active=$3 WHERE id=$4 AND deleted_at IS NULL RETURNING id, username, email, full_name, role, is_active',
            [full_name, role, is_active, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'User không tồn tại' });
        res.json({ success: true, message: 'Cập nhật user thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

const deleteUser = async (req, res, next) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Không thể xóa chính mình' });
        }
        await query('UPDATE users SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
        res.json({ success: true, message: 'Xóa user thành công' });
    } catch (error) { next(error); }
};

const resetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        const hash = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password_hash=$1 WHERE id=$2 AND deleted_at IS NULL', [hash, req.params.id]);
        res.json({ success: true, message: 'Reset mật khẩu thành công' });
    } catch (error) { next(error); }
};

module.exports = { getUsers, createUser, updateUser, deleteUser, resetPassword };
