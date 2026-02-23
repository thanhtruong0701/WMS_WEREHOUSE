const express = require('express');
const router = express.Router();
const ctrl = require('./material.controller');
const { verifyToken, checkRole } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Materials
 *   description: Quản lý nguyên vật liệu
 */
router.get('/', ctrl.getMaterials);
router.get('/:id', ctrl.getMaterial);
router.post('/', checkRole('admin', 'staff'), auditLog('CREATE', 'materials'), ctrl.createMaterial);
router.put('/:id', checkRole('admin', 'staff'), auditLog('UPDATE', 'materials'), ctrl.updateMaterial);
router.delete('/:id', checkRole('admin'), auditLog('DELETE', 'materials'), ctrl.deleteMaterial);
router.post('/:id/stock-in', checkRole('admin', 'staff'), auditLog('STOCK_IN', 'inventory_transactions'), ctrl.stockIn);
router.post('/:id/stock-out', checkRole('admin', 'staff'), auditLog('STOCK_OUT', 'inventory_transactions'), ctrl.stockOut);
router.get('/:id/transactions', ctrl.getMaterialTransactions);

module.exports = router;
