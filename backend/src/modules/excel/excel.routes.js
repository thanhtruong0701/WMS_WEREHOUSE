const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('./excel.controller');
const { verifyToken, checkRole } = require('../../middleware/auth.middleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(verifyToken);

router.get('/export/material', ctrl.exportMaterial);
router.get('/export/fg', ctrl.exportFG);
router.post('/import/material', checkRole('admin', 'staff'), upload.single('file'), ctrl.importMaterial);
router.post('/import/fg', checkRole('admin', 'staff'), upload.single('file'), ctrl.importFG);

module.exports = router;
