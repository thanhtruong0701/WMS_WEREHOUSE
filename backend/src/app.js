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

// Ensure logs directory exists (skip in serverless)
if (process.env.NODE_ENV !== 'production') {
    try {
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    } catch (e) {
        console.warn('⚠️ Could not create logs directory:', e.message);
    }
}

// Security & middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: true, // Allow all for simplicity in this demo, or specifically your Vercel URL
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

// Debug endpoint for Vercel (safe info)
app.get('/api/debug-status', async (req, res) => {
    const { pool } = require('./config/database');
    const dbStatus = { connected: false, error: null };
    try {
        await pool.query('SELECT 1');
        dbStatus.connected = true;
    } catch (e) {
        dbStatus.error = e.message;
    }

    res.json({
        success: true,
        env: {
            NODE_ENV: process.env.NODE_ENV,
            HAS_DB_URL: !!process.env.DATABASE_URL,
            HAS_JWT_SECRET: !!process.env.JWT_SECRET,
        },
        db: dbStatus,
        vercel: !!process.env.VERCEL
    });
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
