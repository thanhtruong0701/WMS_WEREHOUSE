try {
    const app = require('../backend/src/app');
    module.exports = app;
} catch (error) {
    console.error('CRITICAL: Serverless bridge failed to initialize:', error);

    // Fallback minimal app to show error if possible
    const express = require('express');
    const app = express();
    app.all('*', (req, res) => {
        res.status(500).json({
            success: false,
            message: 'Bridge initialization failed',
            error: error.message,
            stack: error.stack
        });
    });
    module.exports = app;
}
