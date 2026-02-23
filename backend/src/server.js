const app = require('./app');
const { pool } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3001;

const start = async () => {
    try {
        // Test DB connection
        await pool.query('SELECT 1');
        logger.info('✅ Database connected successfully');

        app.listen(PORT, () => {
            logger.info(`🚀 WMS Backend server running on port ${PORT}`);
            logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
            logger.info(`💡 Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

start();
