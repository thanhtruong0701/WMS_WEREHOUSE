const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Warehouse Management System API',
            version: '1.0.0',
            description: 'REST API cho hệ thống quản lý xuất nhập tồn kho',
        },
        servers: [
            { url: 'http://localhost:3001/api', description: 'Development server' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.controller.js'],
};

module.exports = swaggerJsdoc(options);
