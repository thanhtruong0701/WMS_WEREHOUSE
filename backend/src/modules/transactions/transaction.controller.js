const { query } = require('../../config/database');

// Confirm a material inventory transaction
const confirmInventoryTransaction = async (req, res, next) => {
    try {
        const txResult = await query(
            'SELECT * FROM inventory_transactions WHERE id=$1 AND deleted_at IS NULL', [req.params.id]
        );
        if (!txResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Transaction không tồn tại' });
        }
        const tx = txResult.rows[0];
        if (tx.status === 'confirmed') {
            return res.status(400).json({ success: false, message: 'Transaction đã được confirmed' });
        }

        // If stock out, re-check stock
        if (tx.transaction_type === 'out') {
            const stockResult = await query(
                `SELECT COALESCE(SUM(CASE WHEN transaction_type='in' THEN quantity ELSE -quantity END), 0) AS stock
         FROM inventory_transactions WHERE material_id=$1 AND status='confirmed' AND deleted_at IS NULL`,
                [tx.material_id]
            );
            const currentStock = parseFloat(stockResult.rows[0].stock);
            if (currentStock < parseFloat(tx.quantity)) {
                return res.status(400).json({
                    success: false,
                    message: `Tồn kho không đủ để confirm. Tồn: ${currentStock}, Yêu cầu: ${tx.quantity}`,
                });
            }
        }

        const result = await query(
            `UPDATE inventory_transactions SET status='confirmed', confirmed_by=$1, confirmed_at=NOW()
       WHERE id=$2 RETURNING *`,
            [req.user.id, req.params.id]
        );

        res.json({ success: true, message: 'Xác nhận phiếu thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

// Confirm a production transaction
const confirmProductionTransaction = async (req, res, next) => {
    try {
        const txResult = await query(
            'SELECT * FROM production_transactions WHERE id=$1 AND deleted_at IS NULL', [req.params.id]
        );
        if (!txResult.rows.length) return res.status(404).json({ success: false, message: 'Transaction không tồn tại' });
        if (txResult.rows[0].status === 'confirmed') {
            return res.status(400).json({ success: false, message: 'Transaction đã được confirmed' });
        }

        const result = await query(
            `UPDATE production_transactions SET status='confirmed', confirmed_by=$1, confirmed_at=NOW()
       WHERE id=$2 RETURNING *`,
            [req.user.id, req.params.id]
        );
        res.json({ success: true, message: 'Xác nhận phiếu nhập production thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

// Confirm a shipment transaction
const confirmShipmentTransaction = async (req, res, next) => {
    try {
        const txResult = await query(
            'SELECT * FROM shipment_transactions WHERE id=$1 AND deleted_at IS NULL', [req.params.id]
        );
        if (!txResult.rows.length) return res.status(404).json({ success: false, message: 'Transaction không tồn tại' });
        if (txResult.rows[0].status === 'confirmed') {
            return res.status(400).json({ success: false, message: 'Transaction đã được confirmed' });
        }

        // Re-validate stock
        const stockResult = await query(
            `SELECT COALESCE((SELECT SUM(quantity) FROM production_transactions WHERE fg_product_id=$1 AND status='confirmed' AND deleted_at IS NULL),0)
       - COALESCE((SELECT SUM(quantity) FROM shipment_transactions WHERE fg_product_id=$1 AND status='confirmed' AND deleted_at IS NULL),0) AS stock`,
            [txResult.rows[0].fg_product_id]
        );
        const currentStock = parseFloat(stockResult.rows[0].stock);
        if (currentStock < parseFloat(txResult.rows[0].quantity)) {
            return res.status(400).json({
                success: false,
                message: `Tồn kho không đủ để confirm. Tồn: ${currentStock}`,
            });
        }

        const result = await query(
            `UPDATE shipment_transactions SET status='confirmed', confirmed_by=$1, confirmed_at=NOW()
       WHERE id=$2 RETURNING *`,
            [req.user.id, req.params.id]
        );
        res.json({ success: true, message: 'Xác nhận phiếu xuất thành công', data: result.rows[0] });
    } catch (error) { next(error); }
};

// List all transactions (material + production + shipment) with filters
const listAllTransactions = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type, status, date_from, date_to } = req.query;
        const offset = (page - 1) * limit;
        const params = [];
        const addCond = (col, val) => { params.push(val); return `${col}=$${params.length}`; };

        let invWhere = ['it.deleted_at IS NULL'];
        let prodWhere = ['pt.deleted_at IS NULL'];
        let shipWhere = ['st.deleted_at IS NULL'];

        if (status) {
            const s = status;
            invWhere.push(`it.status='${s}'`);
            prodWhere.push(`pt.status='${s}'`);
            shipWhere.push(`st.status='${s}'`);
        }
        if (date_from) {
            invWhere.push(`it.transaction_date >= '${date_from}'`);
            prodWhere.push(`pt.transaction_date >= '${date_from}'`);
            shipWhere.push(`st.transaction_date >= '${date_from}'`);
        }
        if (date_to) {
            invWhere.push(`it.transaction_date <= '${date_to}'`);
            prodWhere.push(`pt.transaction_date <= '${date_to}'`);
            shipWhere.push(`st.transaction_date <= '${date_to}'`);
        }

        const invQ = `SELECT it.id, 'material' AS category, it.transaction_type AS sub_type,
      m.code AS item_code, m.name AS item_name, it.quantity, it.unit, it.transaction_date,
      it.reference_no, it.status, it.created_at, u.full_name AS created_by_name
      FROM inventory_transactions it
      JOIN materials m ON it.material_id = m.id
      LEFT JOIN users u ON it.created_by = u.id
      WHERE ${invWhere.join(' AND ')}`;

        const prodQ = `SELECT pt.id, 'fg_production' AS category, 'in' AS sub_type,
      fg.code AS item_code, fg.name AS item_name, pt.quantity, pt.unit, pt.transaction_date,
      pt.production_order_no AS reference_no, pt.status, pt.created_at, u.full_name AS created_by_name
      FROM production_transactions pt
      JOIN fg_products fg ON pt.fg_product_id = fg.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE ${prodWhere.join(' AND ')}`;

        const shipQ = `SELECT st.id, 'fg_shipment' AS category, 'out' AS sub_type,
      fg.code AS item_code, fg.name AS item_name, st.quantity, st.unit, st.transaction_date,
      st.shipment_no AS reference_no, st.status, st.created_at, u.full_name AS created_by_name
      FROM shipment_transactions st
      JOIN fg_products fg ON st.fg_product_id = fg.id
      LEFT JOIN users u ON st.created_by = u.id
      WHERE ${shipWhere.join(' AND ')}`;

        let unionQ;
        if (type === 'material') unionQ = invQ;
        else if (type === 'production') unionQ = prodQ;
        else if (type === 'shipment') unionQ = shipQ;
        else unionQ = `${invQ} UNION ALL ${prodQ} UNION ALL ${shipQ}`;

        const finalQ = `SELECT * FROM (${unionQ}) t ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $1 OFFSET $2`;
        const data = await query(finalQ, [parseInt(limit), offset]);

        res.json({ success: true, data: data.rows });
    } catch (error) { next(error); }
};

module.exports = { confirmInventoryTransaction, confirmProductionTransaction, confirmShipmentTransaction, listAllTransactions };
