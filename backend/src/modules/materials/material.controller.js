const { query } = require('../../config/database');

// ── Helpers ──────────────────────────────────────────────────────────────────
const buildPaginationMeta = (total, page, limit) => ({
    total: parseInt(total),
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
});

// ── List Materials ────────────────────────────────────────────────────────────
const getMaterials = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, supplier, warehouse_id, low_stock } = req.query;
        const offset = (page - 1) * limit;
        const conditions = ['m.deleted_at IS NULL'];
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(m.code ILIKE $${params.length} OR m.name ILIKE $${params.length})`);
        }
        if (supplier) {
            params.push(`%${supplier}%`);
            conditions.push(`m.supplier ILIKE $${params.length}`);
        }
        if (warehouse_id) {
            params.push(warehouse_id);
            conditions.push(`m.warehouse_id = $${params.length}`);
        }

        const where = conditions.join(' AND ');

        const stockSubquery = `
      COALESCE((
        SELECT SUM(CASE WHEN it.transaction_type='in' THEN it.quantity ELSE -it.quantity END)
        FROM inventory_transactions it
        WHERE it.material_id = m.id AND it.status='confirmed' AND it.deleted_at IS NULL
      ), 0) AS current_stock
    `;

        let baseQuery = `
      SELECT m.*, w.name AS warehouse_name, ${stockSubquery}
      FROM materials m
      LEFT JOIN warehouses w ON m.warehouse_id = w.id
      WHERE ${where}
    `;

        if (low_stock === 'true') {
            baseQuery = `SELECT * FROM (${baseQuery}) sq WHERE sq.current_stock <= sq.low_stock_threshold`;
        }

        params.push(parseInt(limit), offset);
        const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) sq`;
        const dataQuery = `${baseQuery} ORDER BY m.code ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const [countResult, dataResult] = await Promise.all([
            query(countQuery, params.slice(0, -2)),
            query(dataQuery, params),
        ]);

        res.json({
            success: true,
            data: dataResult.rows,
            meta: buildPaginationMeta(countResult.rows[0].count, page, limit),
        });
    } catch (error) {
        next(error);
    }
};

// ── Get One Material ─────────────────────────────────────────────────────────
const getMaterial = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT m.*, w.name AS warehouse_name,
        COALESCE((
          SELECT SUM(CASE WHEN it.transaction_type='in' THEN it.quantity ELSE -it.quantity END)
          FROM inventory_transactions it
          WHERE it.material_id = m.id AND it.status='confirmed' AND it.deleted_at IS NULL
        ), 0) AS current_stock
       FROM materials m
       LEFT JOIN warehouses w ON m.warehouse_id = w.id
       WHERE m.id = $1 AND m.deleted_at IS NULL`,
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Material không tồn tại' });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// ── Create Material ───────────────────────────────────────────────────────────
const createMaterial = async (req, res, next) => {
    try {
        const { code, name, unit, supplier, warehouse_id, warehouse_location, low_stock_threshold, description } = req.body;
        const result = await query(
            `INSERT INTO materials (code, name, unit, supplier, warehouse_id, warehouse_location, low_stock_threshold, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [code, name, unit || 'KG', supplier, warehouse_id, warehouse_location, low_stock_threshold || 0, description]
        );
        res.status(201).json({ success: true, message: 'Tạo material thành công', data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// ── Update Material ───────────────────────────────────────────────────────────
const updateMaterial = async (req, res, next) => {
    try {
        const { name, unit, supplier, warehouse_id, warehouse_location, low_stock_threshold, description, is_active } = req.body;
        const result = await query(
            `UPDATE materials SET name=$1, unit=$2, supplier=$3, warehouse_id=$4, warehouse_location=$5,
       low_stock_threshold=$6, description=$7, is_active=$8 WHERE id=$9 AND deleted_at IS NULL RETURNING *`,
            [name, unit, supplier, warehouse_id, warehouse_location, low_stock_threshold, description,
                is_active !== undefined ? is_active : true, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Material không tồn tại' });
        res.json({ success: true, message: 'Cập nhật thành công', data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// ── Soft Delete Material ─────────────────────────────────────────────────────
const deleteMaterial = async (req, res, next) => {
    try {
        const result = await query(
            'UPDATE materials SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id',
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Material không tồn tại' });
        res.json({ success: true, message: 'Xóa material thành công' });
    } catch (error) {
        next(error);
    }
};

// ── Stock In ─────────────────────────────────────────────────────────────────
const stockIn = async (req, res, next) => {
    try {
        const { quantity, unit, transaction_date, reference_no, supplier, note, warehouse_id } = req.body;
        const material_id = req.params.id;

        const mat = await query('SELECT id FROM materials WHERE id=$1 AND deleted_at IS NULL', [material_id]);
        if (!mat.rows.length) return res.status(404).json({ success: false, message: 'Material không tồn tại' });

        const result = await query(
            `INSERT INTO inventory_transactions
       (material_id, warehouse_id, transaction_type, quantity, unit, transaction_date, reference_no, supplier, note, status, created_by)
       VALUES ($1,$2,'in',$3,$4,$5,$6,$7,$8,'draft',$9) RETURNING *`,
            [material_id, warehouse_id, quantity, unit, transaction_date || new Date().toISOString().split('T')[0],
                reference_no, supplier, note, req.user.id]
        );

        res.status(201).json({ success: true, message: 'Tạo phiếu nhập thành công', data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// ── Stock Out ────────────────────────────────────────────────────────────────
const stockOut = async (req, res, next) => {
    try {
        const { quantity, unit, transaction_date, reference_no, note, warehouse_id } = req.body;
        const material_id = req.params.id;

        // Check current stock
        const stockResult = await query(
            `SELECT COALESCE(SUM(CASE WHEN transaction_type='in' THEN quantity ELSE -quantity END), 0) AS stock
       FROM inventory_transactions WHERE material_id=$1 AND status='confirmed' AND deleted_at IS NULL`,
            [material_id]
        );

        const currentStock = parseFloat(stockResult.rows[0].stock);
        if (currentStock < parseFloat(quantity)) {
            return res.status(400).json({
                success: false,
                message: `Tồn kho không đủ. Tồn hiện tại: ${currentStock}, Số lượng xuất: ${quantity}`,
            });
        }

        const result = await query(
            `INSERT INTO inventory_transactions
       (material_id, warehouse_id, transaction_type, quantity, unit, transaction_date, reference_no, note, status, created_by)
       VALUES ($1,$2,'out',$3,$4,$5,$6,$7,'draft',$8) RETURNING *`,
            [material_id, warehouse_id, quantity, unit, transaction_date || new Date().toISOString().split('T')[0],
                reference_no, note, req.user.id]
        );

        res.status(201).json({ success: true, message: 'Tạo phiếu xuất thành công', data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// ── Get Transactions for a Material ──────────────────────────────────────────
const getMaterialTransactions = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type, status, date_from, date_to } = req.query;
        const offset = (page - 1) * limit;
        const conditions = ['material_id=$1', 'deleted_at IS NULL'];
        const params = [req.params.id];

        if (type) { params.push(type); conditions.push(`transaction_type=$${params.length}`); }
        if (status) { params.push(status); conditions.push(`status=$${params.length}`); }
        if (date_from) { params.push(date_from); conditions.push(`transaction_date >= $${params.length}`); }
        if (date_to) { params.push(date_to); conditions.push(`transaction_date <= $${params.length}`); }

        const where = conditions.join(' AND ');
        params.push(parseInt(limit), offset);

        const [count, data] = await Promise.all([
            query(`SELECT COUNT(*) FROM inventory_transactions WHERE ${where}`, params.slice(0, -2)),
            query(`SELECT it.*, u.full_name AS created_by_name, cu.full_name AS confirmed_by_name
             FROM inventory_transactions it
             LEFT JOIN users u ON it.created_by = u.id
             LEFT JOIN users cu ON it.confirmed_by = cu.id
             WHERE ${where} ORDER BY it.transaction_date DESC, it.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
        ]);

        res.json({
            success: true,
            data: data.rows,
            meta: buildPaginationMeta(count.rows[0].count, page, limit),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getMaterials, getMaterial, createMaterial, updateMaterial, deleteMaterial, stockIn, stockOut, getMaterialTransactions };
