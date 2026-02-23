const { query } = require('../../config/database');

const getWarehouses = async (req, res, next) => {
    try {
        const { type } = req.query;
        const conditions = ['deleted_at IS NULL'];
        const params = [];
        if (type) { params.push(type); conditions.push(`type=$${params.length}`); }
        const result = await query(`SELECT * FROM warehouses WHERE ${conditions.join(' AND ')} ORDER BY type, code`, params);
        res.json({ success: true, data: result.rows });
    } catch (error) { next(error); }
};

const createWarehouse = async (req, res, next) => {
    try {
        const { code, name, type, location, description } = req.body;
        const result = await query(
            'INSERT INTO warehouses (code, name, type, location, description) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [code, name, type, location, description]
        );
        res.status(201).json({ success: true, message: 'Tạo kho thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

const updateWarehouse = async (req, res, next) => {
    try {
        const { name, location, description, is_active } = req.body;
        const result = await query(
            'UPDATE warehouses SET name=$1, location=$2, description=$3, is_active=$4 WHERE id=$5 AND deleted_at IS NULL RETURNING *',
            [name, location, description, is_active !== undefined ? is_active : true, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Kho không tồn tại' });
        res.json({ success: true, message: 'Cập nhật kho thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

const getAuditLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, table_name, action, date_from, date_to } = req.query;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];

        if (table_name) { params.push(table_name); conditions.push(`table_name=$${params.length}`); }
        if (action) { params.push(`%${action}%`); conditions.push(`action ILIKE $${params.length}`); }
        if (date_from) { params.push(date_from); conditions.push(`created_at >= $${params.length}`); }
        if (date_to) { params.push(date_to + ' 23:59:59'); conditions.push(`created_at <= $${params.length}`); }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(parseInt(limit), offset);

        const [count, data] = await Promise.all([
            query(`SELECT COUNT(*) FROM audit_logs ${where}`, params.slice(0, -2)),
            query(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
        ]);

        res.json({ success: true, data: data.rows, meta: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) { next(error); }
};

module.exports = { getWarehouses, createWarehouse, updateWarehouse, getAuditLogs };
