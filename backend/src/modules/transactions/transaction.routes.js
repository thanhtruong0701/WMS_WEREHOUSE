const express = require('express');
const router = express.Router();
const ctrl = require('./transaction.controller');
const { verifyToken, checkRole } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(verifyToken);

router.get('/', ctrl.listAllTransactions);
router.post('/material/:id/confirm', checkRole('admin', 'staff'), auditLog('CONFIRM', 'inventory_transactions'), ctrl.confirmInventoryTransaction);
router.post('/production/:id/confirm', checkRole('admin', 'staff'), auditLog('CONFIRM', 'production_transactions'), ctrl.confirmProductionTransaction);
router.post('/shipment/:id/confirm', checkRole('admin', 'staff'), auditLog('CONFIRM', 'shipment_transactions'), ctrl.confirmShipmentTransaction);

module.exports = router;
