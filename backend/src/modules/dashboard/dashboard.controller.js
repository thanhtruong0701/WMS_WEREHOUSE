const { query } = require('../../config/database');

const getDashboardStats = async (req, res, next) => {
  try {
    const [
      materialCount,
      fgCount,
      materialStock,
      fgStock,
      lowStockMaterials,
      lowStockFG,
      monthlyMaterialTx,
      monthlyFGTx,
      topUsageMaterials,
      pendingCount,
      recentTransactions,
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM materials WHERE deleted_at IS NULL AND is_active=true'),
      query('SELECT COUNT(*) FROM fg_products WHERE deleted_at IS NULL AND is_active=true'),
      query(`
        SELECT COALESCE(SUM(CASE WHEN transaction_type='in' THEN quantity ELSE -quantity END),0) AS total_stock
        FROM inventory_transactions WHERE status='confirmed' AND deleted_at IS NULL
      `),
      query(`
        SELECT COALESCE(
          (SELECT SUM(quantity) FROM production_transactions WHERE status='confirmed' AND deleted_at IS NULL),0)
          - COALESCE(
          (SELECT SUM(quantity) FROM shipment_transactions WHERE status='confirmed' AND deleted_at IS NULL),0) AS total_stock
      `),
      query(`
        SELECT m.code, m.name, m.low_stock_threshold,
          COALESCE(SUM(CASE WHEN it.transaction_type='in' THEN it.quantity ELSE -it.quantity END),0) AS current_stock
        FROM materials m
        LEFT JOIN inventory_transactions it ON m.id=it.material_id AND it.status='confirmed' AND it.deleted_at IS NULL
        WHERE m.deleted_at IS NULL AND m.is_active=true
        GROUP BY m.id, m.code, m.name, m.low_stock_threshold
        HAVING COALESCE(SUM(CASE WHEN it.transaction_type='in' THEN it.quantity ELSE -it.quantity END),0) <= m.low_stock_threshold
        ORDER BY current_stock ASC LIMIT 10
      `),
      query(`
        SELECT fg.code, fg.name, fg.size, fg.color, fg.low_stock_threshold,
          COALESCE((SELECT SUM(quantity) FROM production_transactions WHERE fg_product_id=fg.id AND status='confirmed' AND deleted_at IS NULL),0)
          - COALESCE((SELECT SUM(quantity) FROM shipment_transactions WHERE fg_product_id=fg.id AND status='confirmed' AND deleted_at IS NULL),0) AS current_stock
        FROM fg_products fg
        WHERE fg.deleted_at IS NULL AND fg.is_active=true
        GROUP BY fg.id, fg.code, fg.name, fg.size, fg.color, fg.low_stock_threshold
        HAVING COALESCE((SELECT SUM(quantity) FROM production_transactions WHERE fg_product_id=fg.id AND status='confirmed' AND deleted_at IS NULL),0)
          - COALESCE((SELECT SUM(quantity) FROM shipment_transactions WHERE fg_product_id=fg.id AND status='confirmed' AND deleted_at IS NULL),0) <= fg.low_stock_threshold
        ORDER BY current_stock ASC LIMIT 10
      `),
      query(`
        SELECT TO_CHAR(transaction_date,'YYYY-MM') AS month,
          SUM(CASE WHEN transaction_type='in' THEN quantity ELSE 0 END) AS total_in,
          SUM(CASE WHEN transaction_type='out' THEN quantity ELSE 0 END) AS total_out
        FROM inventory_transactions
        WHERE status='confirmed' AND deleted_at IS NULL
          AND transaction_date >= NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month
      `),
      query(`
        SELECT TO_CHAR(transaction_date,'YYYY-MM') AS month,
          SUM(quantity) AS total_production
        FROM production_transactions
        WHERE status='confirmed' AND deleted_at IS NULL
          AND transaction_date >= NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month
      `),
      query(`
        SELECT m.code, m.name, SUM(it.quantity) as total_usage
        FROM materials m
        JOIN inventory_transactions it ON m.id = it.material_id
        WHERE it.transaction_type = 'out' AND it.status = 'confirmed' AND it.deleted_at IS NULL
          AND it.transaction_date >= NOW() - INTERVAL '30 days'
        GROUP BY m.id, m.code, m.name
        ORDER BY total_usage DESC LIMIT 5
      `),
      query(`
        SELECT COUNT(*) FROM (
          SELECT id FROM inventory_transactions WHERE status='draft' AND deleted_at IS NULL
          UNION ALL
          SELECT id FROM production_transactions WHERE status='draft' AND deleted_at IS NULL
          UNION ALL
          SELECT id FROM shipment_transactions WHERE status='draft' AND deleted_at IS NULL
        ) sq
      `),
      query(`
        SELECT 'material' AS type, it.transaction_type AS sub_type,
          m.code AS item_code, m.name AS item_name, it.quantity, it.unit, it.transaction_date, it.status, it.created_at
        FROM inventory_transactions it JOIN materials m ON it.material_id=m.id
        WHERE it.deleted_at IS NULL
        UNION ALL
        SELECT 'production' AS type, 'in' AS sub_type,
          fg.code AS item_code, fg.name AS item_name, pt.quantity, pt.unit, pt.transaction_date, pt.status, pt.created_at
        FROM production_transactions pt JOIN fg_products fg ON pt.fg_product_id=fg.id
        WHERE pt.deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 10
      `),
    ]);

    // Calculate In/Out Ratio for Materials
    const totalIn = monthlyMaterialTx.rows.reduce((sum, r) => sum + parseFloat(r.total_in), 0);
    const totalOut = monthlyMaterialTx.rows.reduce((sum, r) => sum + parseFloat(r.total_out), 0);
    const ratioInVsOut = totalIn > 0 ? (totalOut / totalIn) * 100 : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalMaterials: parseInt(materialCount.rows[0].count),
          totalFGProducts: parseInt(fgCount.rows[0].count),
          totalMaterialStock: parseFloat(materialStock.rows[0].total_stock),
          totalFGStock: parseFloat(fgStock.rows[0].total_stock),
          lowStockMaterialCount: lowStockMaterials.rows.length,
          lowStockFGCount: lowStockFG.rows.length,
          ratioInVsOut: parseFloat(ratioInVsOut.toFixed(1)),
          pendingTxCount: parseInt(pendingCount.rows[0].count),
        },
        lowStockMaterials: lowStockMaterials.rows,
        lowStockFG: lowStockFG.rows,
        monthlyMaterialTx: monthlyMaterialTx.rows,
        monthlyFGTx: monthlyFGTx.rows,
        topUsageMaterials: topUsageMaterials.rows,
        recentTransactions: recentTransactions.rows,
      },
    });
  } catch (error) { next(error); }
};

module.exports = { getDashboardStats };
