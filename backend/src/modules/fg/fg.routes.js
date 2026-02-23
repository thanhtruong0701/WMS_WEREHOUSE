const express = require('express');
const router = express.Router();
const ctrl = require('./fg.controller');
const { verifyToken, checkRole } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(verifyToken);

router.get('/', ctrl.getFGProducts);
router.get('/:id', ctrl.getFGProduct);
router.post('/', checkRole('admin', 'staff'), auditLog('CREATE', 'fg_products'), ctrl.createFGProduct);
router.put('/:id', checkRole('admin', 'staff'), auditLog('UPDATE', 'fg_products'), ctrl.updateFGProduct);
router.delete('/:id', checkRole('admin'), auditLog('DELETE', 'fg_products'), ctrl.deleteFGProduct);
router.post('/:id/production-in', checkRole('admin', 'staff'), auditLog('PRODUCTION_IN', 'production_transactions'), ctrl.productionIn);
router.post('/:id/shipment-out', checkRole('admin', 'staff'), auditLog('SHIPMENT_OUT', 'shipment_transactions'), ctrl.shipmentOut);
router.get('/:id/transactions', ctrl.getFGTransactions);

module.exports = router;
