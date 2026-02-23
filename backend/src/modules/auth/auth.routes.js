const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const { login, getProfile, changePassword } = require('./auth.controller');

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập hệ thống
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, example: admin }
 *               password: { type: string, example: password }
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về JWT token
 */
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);
router.put('/change-password', verifyToken, changePassword);

module.exports = router;
