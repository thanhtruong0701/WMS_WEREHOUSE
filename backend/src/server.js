const app = require('./app');
const { pool } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3001;

const start = async () => {
    try {
        // Clear log if DATABASE_URL is missing
        if (!process.env.DATABASE_URL) {
            logger.warn('⚠️ DATABASE_URL is not set. Database operations will fail.');
        }

        // Test DB connection but don't crash if it fails (Vercel might retry)
        try {
            await pool.query('SELECT 1');
            logger.info('✅ Database connected successfully (Supabase)');
        } catch (dbError) {
            logger.error('❌ Database connection failed at startup:', dbError.message);
            // In serverless, we might still want to start helpfully
        }

        app.listen(PORT, () => {
            logger.info(`🚀 WMS Backend server running on port ${PORT}`);
            logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
            logger.info(`💡 Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        // Fallback for extreme cases
    }
};

start();
