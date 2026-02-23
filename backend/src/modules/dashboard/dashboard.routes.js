const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('./dashboard.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.get('/stats', authenticate, getDashboardStats);

module.exports = router;
