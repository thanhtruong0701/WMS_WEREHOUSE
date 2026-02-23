const express = require('express');
const router = express.Router();
const ctrl = require('./fg.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(authenticate);

router.get('/', ctrl.getFGProducts);
router.get('/:id', ctrl.getFGProduct);
router.post('/', authorize('admin', 'staff'), auditLog('CREATE', 'fg_products'), ctrl.createFGProduct);
router.put('/:id', authorize('admin', 'staff'), auditLog('UPDATE', 'fg_products'), ctrl.updateFGProduct);
router.delete('/:id', authorize('admin'), auditLog('DELETE', 'fg_products'), ctrl.deleteFGProduct);
router.post('/:id/production-in', authorize('admin', 'staff'), auditLog('PRODUCTION_IN', 'production_transactions'), ctrl.productionIn);
router.post('/:id/shipment-out', authorize('admin', 'staff'), auditLog('SHIPMENT_OUT', 'shipment_transactions'), ctrl.shipmentOut);
router.get('/:id/transactions', ctrl.getFGTransactions);

module.exports = router;
