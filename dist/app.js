"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const partner_routes_1 = __importDefault(require("./routes/partner.routes"));
const eco_score_routes_1 = __importDefault(require("./routes/eco-score.routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./docs/swagger");
dotenv_1.default.config();
const app = (0, express_1.default)();
// ✅ CORS CONFIGURATION
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    'https://ecolojia.com',
    'https://www.ecolojia.com',
    'https://ecolojia.vercel.app'
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Non autorisé par CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-key', 'x-api-key']
};
// ✅ MIDDLEWARES
app.use((0, cors_1.default)(corsOptions));
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// ✅ ROUTES API
app.use('/api', product_routes_1.default);
app.use('/api', partner_routes_1.default);
app.use('/api/eco-score', eco_score_routes_1.default);
app.use('/', health_routes_1.default);
// ✅ SWAGGER DOCS
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
console.log('📘 Swagger docs: http://localhost:3000/api-docs');
// ✅ LOGS
console.log('✅ Routes de tracking partenaire activées');
console.log('✅ Routes de score écologique IA activées');
console.log('✅ CORS configuré pour:', allowedOrigins);
console.log('✅ Base de données:', process.env.DATABASE_URL ? 'connectée' : 'non configurée');
// ✅ ROOT INFO
app.get('/', (_req, res) => {
    res.json({
        message: 'Ecolojia API',
        version: '1.0.0',
        status: 'operational',
        environment: process.env.NODE_ENV || 'development',
        endpoints: [
            'GET /api/products',
            'GET /api/products/search',
            'GET /api/products/stats',
            'GET /api/products/:slug',
            'GET /api/products/:id/similar',
            'POST /api/products',
            'PUT /api/products/:id',
            'DELETE /api/products/:id',
            'GET /api/track/:id',
            'POST /api/eco-score/calculate',
            'POST /api/eco-score/update/:productId',
            'POST /api/eco-score/update-all',
            'GET /api/eco-score/stats',
            'GET /api/eco-score/test',
            'GET /health',
            'GET /api-docs'
        ],
        timestamp: new Date().toISOString()
    });
});
exports.default = app;
