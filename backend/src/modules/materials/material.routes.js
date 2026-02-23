const express = require('express');
const router = express.Router();
const ctrl = require('./material.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Materials
 *   description: Quản lý nguyên vật liệu
 */
router.get('/', ctrl.getMaterials);
router.get('/:id', ctrl.getMaterial);
router.post('/', authorize('admin', 'staff'), auditLog('CREATE', 'materials'), ctrl.createMaterial);
router.put('/:id', authorize('admin', 'staff'), auditLog('UPDATE', 'materials'), ctrl.updateMaterial);
router.delete('/:id', authorize('admin'), auditLog('DELETE', 'materials'), ctrl.deleteMaterial);
router.post('/:id/stock-in', authorize('admin', 'staff'), auditLog('STOCK_IN', 'inventory_transactions'), ctrl.stockIn);
router.post('/:id/stock-out', authorize('admin', 'staff'), auditLog('STOCK_OUT', 'inventory_transactions'), ctrl.stockOut);
router.get('/:id/transactions', ctrl.getMaterialTransactions);

module.exports = router;
