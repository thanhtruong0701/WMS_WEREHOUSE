const { query } = require('../../config/database');

const buildPagination = (total, page, limit) => ({
    total: parseInt(total), page: parseInt(page), limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
});

const getFGProducts = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, customer, order_no, warehouse_id, low_stock } = req.query;
        const offset = (page - 1) * limit;
        const conditions = ['fg.deleted_at IS NULL'];
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(fg.code ILIKE $${params.length} OR fg.name ILIKE $${params.length})`);
        }
        if (customer) { params.push(`%${customer}%`); conditions.push(`fg.customer ILIKE $${params.length}`); }
        if (order_no) { params.push(`%${order_no}%`); conditions.push(`fg.order_no ILIKE $${params.length}`); }
        if (warehouse_id) { params.push(warehouse_id); conditions.push(`fg.warehouse_id = $${params.length}`); }

        const where = conditions.join(' AND ');
        const stockSub = `
      COALESCE((SELECT SUM(quantity) FROM production_transactions pt WHERE pt.fg_product_id=fg.id AND pt.status='confirmed' AND pt.deleted_at IS NULL), 0)
      - COALESCE((SELECT SUM(quantity) FROM shipment_transactions st WHERE st.fg_product_id=fg.id AND st.status='confirmed' AND st.deleted_at IS NULL), 0)
      AS current_stock
    `;

        let baseQuery = `SELECT fg.*, w.name AS warehouse_name, ${stockSub}
      FROM fg_products fg LEFT JOIN warehouses w ON fg.warehouse_id = w.id WHERE ${where}`;

        if (low_stock === 'true') {
            baseQuery = `SELECT * FROM (${baseQuery}) sq WHERE sq.current_stock <= sq.low_stock_threshold`;
        }

        params.push(parseInt(limit), offset);
        const [count, data] = await Promise.all([
            query(`SELECT COUNT(*) FROM (${baseQuery}) sq`, params.slice(0, -2)),
            query(`${baseQuery} ORDER BY fg.code, fg.size ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
        ]);

        res.json({ success: true, data: data.rows, meta: buildPagination(count.rows[0].count, page, limit) });
    } catch (error) { next(error); }
};

const getFGProduct = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT fg.*, w.name AS warehouse_name,
        COALESCE((SELECT SUM(quantity) FROM production_transactions WHERE fg_product_id=fg.id AND status='confirmed' AND deleted_at IS NULL),0)
        - COALESCE((SELECT SUM(quantity) FROM shipment_transactions WHERE fg_product_id=fg.id AND status='confirmed' AND deleted_at IS NULL),0) AS current_stock
       FROM fg_products fg LEFT JOIN warehouses w ON fg.warehouse_id=w.id
       WHERE fg.id=$1 AND fg.deleted_at IS NULL`, [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'FG Product không tồn tại' });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
};

const createFGProduct = async (req, res, next) => {
    try {
        const { code, name, customer, order_no, size, color, unit, warehouse_id, low_stock_threshold, description } = req.body;
        const result = await query(
            `INSERT INTO fg_products (code, name, customer, order_no, size, color, unit, warehouse_id, low_stock_threshold, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [code, name, customer, order_no, size, color, unit || 'PCS', warehouse_id, low_stock_threshold || 0, description]
        );
        res.status(201).json({ success: true, message: 'Tạo FG product thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

const updateFGProduct = async (req, res, next) => {
    try {
        const { name, customer, order_no, size, color, unit, warehouse_id, low_stock_threshold, description, is_active } = req.body;
        const result = await query(
            `UPDATE fg_products SET name=$1, customer=$2, order_no=$3, size=$4, color=$5, unit=$6,
       warehouse_id=$7, low_stock_threshold=$8, description=$9, is_active=$10 WHERE id=$11 AND deleted_at IS NULL RETURNING *`,
            [name, customer, order_no, size, color, unit, warehouse_id, low_stock_threshold, description,
                is_active !== undefined ? is_active : true, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'FG Product không tồn tại' });
        res.json({ success: true, message: 'Cập nhật thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

const deleteFGProduct = async (req, res, next) => {
    try {
        const result = await query(
            'UPDATE fg_products SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'FG Product không tồn tại' });
        res.json({ success: true, message: 'Xóa FG product thành công' });
    } catch (error) { next(error); }
};

const productionIn = async (req, res, next) => {
    try {
        const { quantity, unit, transaction_date, production_order_no, note, warehouse_id } = req.body;
        const result = await query(
            `INSERT INTO production_transactions (fg_product_id, warehouse_id, quantity, unit, transaction_date, production_order_no, note, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8) RETURNING *`,
            [req.params.id, warehouse_id, quantity, unit || 'PCS', transaction_date || new Date().toISOString().split('T')[0],
                production_order_no, note, req.user.id]
        );
        res.status(201).json({ success: true, message: 'Tạo phiếu nhập sản xuất thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

const shipmentOut = async (req, res, next) => {
    try {
        const { quantity, unit, transaction_date, shipment_no, invoice_no, customer, note, warehouse_id } = req.body;

        const stockResult = await query(
            `SELECT COALESCE(
        (SELECT SUM(quantity) FROM production_transactions WHERE fg_product_id=$1 AND status='confirmed' AND deleted_at IS NULL), 0)
        - COALESCE(
        (SELECT SUM(quantity) FROM shipment_transactions WHERE fg_product_id=$1 AND status='confirmed' AND deleted_at IS NULL), 0) AS stock`,
            [req.params.id]
        );
        const currentStock = parseFloat(stockResult.rows[0].stock);
        if (currentStock < parseFloat(quantity)) {
            return res.status(400).json({
                success: false,
                message: `Tồn kho không đủ. Tồn hiện tại: ${currentStock}, Số lượng xuất: ${quantity}`,
            });
        }

        const result = await query(
            `INSERT INTO shipment_transactions (fg_product_id, warehouse_id, customer, quantity, unit, transaction_date, shipment_no, invoice_no, note, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10) RETURNING *`,
            [req.params.id, warehouse_id, customer, quantity, unit || 'PCS',
            transaction_date || new Date().toISOString().split('T')[0], shipment_no, invoice_no, note, req.user.id]
        );
        res.status(201).json({ success: true, message: 'Tạo phiếu xuất thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

const getFGTransactions = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type, status, date_from, date_to } = req.query;
        const offset = (page - 1) * limit;
        const fgId = req.params.id;

        let prodQ = `SELECT id, fg_product_id, warehouse_id, quantity, unit, transaction_date,
      production_order_no AS reference_no, note, status, created_by, confirmed_by, confirmed_at, created_at, 'production' AS type
      FROM production_transactions WHERE fg_product_id='${fgId}' AND deleted_at IS NULL AND status!='deleted'`;
        let shipQ = `SELECT id, fg_product_id, warehouse_id, quantity, unit, transaction_date,
      shipment_no AS reference_no, note, status, created_by, confirmed_by, confirmed_at, created_at, 'shipment' AS type
      FROM shipment_transactions WHERE fg_product_id='${fgId}' AND deleted_at IS NULL AND status!='deleted'`;

        if (type === 'production') shipQ = null;
        if (type === 'shipment') prodQ = null;

        const unionQuery = [prodQ, shipQ].filter(Boolean).join(' UNION ALL ');
        params_base = [];
        if (date_from) { params_base.push(date_from); }
        if (date_to) { params_base.push(date_to); }

        const sortedQuery = `SELECT * FROM (${unionQuery}) t ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $1 OFFSET $2`;
        const data = await query(sortedQuery, [parseInt(limit), offset]);

        res.json({ success: true, data: data.rows });
    } catch (error) { next(error); }
};

module.exports = { getFGProducts, getFGProduct, createFGProduct, updateFGProduct, deleteFGProduct, productionIn, shipmentOut, getFGTransactions };
