const { query } = require('../config/database');

const auditLog = (action, tableName) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = async function (data) {
            try {
                if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
                    await query(
                        `INSERT INTO audit_logs (user_id, username, action, table_name, record_id, new_values, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            req.user.id,
                            req.user.username,
                            action,
                            tableName,
                            data?.data?.id || req.params?.id || null,
                            data?.data ? JSON.stringify(data.data) : null,
                            req.ip,
                            req.get('user-agent'),
                        ]
                    );
                }
            } catch (err) {
                console.error('Audit log error:', err.message);
            }
            return originalJson(data);
        };

        next();
    };
};

module.exports = { auditLog };
