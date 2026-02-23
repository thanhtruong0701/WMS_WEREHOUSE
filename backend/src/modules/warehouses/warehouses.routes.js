const express = require('express');
const router = express.Router();
const { getWarehouses, createWarehouse, updateWarehouse, getAuditLogs } = require('./warehouses.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/', getWarehouses);
router.post('/', authorize('admin'), createWarehouse);
router.put('/:id', authorize('admin'), updateWarehouse);
router.get('/audit-logs', authorize('admin'), getAuditLogs);

module.exports = router;
