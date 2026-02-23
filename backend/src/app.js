require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// Security & middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'WMS API is running', timestamp: new Date().toISOString() });
});

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { background-color: #1E3A5F; }',
    customSiteTitle: 'WMS API Docs',
}));

// API Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/materials', require('./modules/materials/material.routes'));
app.use('/api/fg-products', require('./modules/fg/fg.routes'));
app.use('/api/transactions', require('./modules/transactions/transaction.routes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/excel', require('./modules/excel/excel.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/warehouses', require('./modules/warehouses/warehouses.routes'));

// Error handling
const { errorHandler, notFound } = require('./middleware/error.middleware');
app.use(notFound);
app.use(errorHandler);

module.exports = app;
