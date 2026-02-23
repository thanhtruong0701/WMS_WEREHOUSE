const express = require('express');
const router = express.Router();
const { getWarehouses, createWarehouse, updateWarehouse, getAuditLogs } = require('./warehouses.controller');
const { verifyToken, checkRole } = require('../../middleware/auth.middleware');

router.use(verifyToken);

router.get('/', getWarehouses);
router.post('/', checkRole('admin'), createWarehouse);
router.put('/:id', checkRole('admin'), updateWarehouse);
router.get('/audit-logs', checkRole('admin'), getAuditLogs);

module.exports = router;
