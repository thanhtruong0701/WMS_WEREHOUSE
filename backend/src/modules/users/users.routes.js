const express = require('express');
const router = express.Router();
const ctrl = require('./users.controller');
const { verifyToken, checkRole } = require('../../middleware/auth.middleware');

router.use(verifyToken, checkRole('admin'));

router.get('/', ctrl.getUsers);
router.post('/', ctrl.createUser);
router.put('/:id', ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);
router.post('/:id/reset-password', ctrl.resetPassword);

module.exports = router;
