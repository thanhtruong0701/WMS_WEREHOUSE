const express = require('express');
const router = express.Router();
const ctrl = require('./transaction.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(authenticate);

router.get('/', ctrl.listAllTransactions);
router.post('/material/:id/confirm', authorize('admin', 'staff'), auditLog('CONFIRM', 'inventory_transactions'), ctrl.confirmInventoryTransaction);
router.post('/production/:id/confirm', authorize('admin', 'staff'), auditLog('CONFIRM', 'production_transactions'), ctrl.confirmProductionTransaction);
router.post('/shipment/:id/confirm', authorize('admin', 'staff'), auditLog('CONFIRM', 'shipment_transactions'), ctrl.confirmShipmentTransaction);

module.exports = router;
