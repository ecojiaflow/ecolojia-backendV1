// src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import productRoutes from './routes/product.routes';
import healthRouter from './routes/health.routes';
import partnerRoutes from './routes/partner.routes';

dotenv.config();

const app: Application = express();

// Configuration CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://ecolojia.com',
  'https://www.ecolojia.com',
  'https://ecolojia.vercel.app'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Autorise les requêtes sans origin (ex: Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middlewares
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api', productRoutes);
app.use('/api', partnerRoutes);
app.use('/', healthRouter);

console.log('✅ Routes de tracking partenaire activées');
console.log('✅ CORS configuré pour:', allowedOrigins);
console.log('✅ Base de données:', process.env.DATABASE_URL ? 'connectée' : 'non configurée');

// Racine d'info
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
      'POST /api/products',
      'PUT /api/products/:id',
      'DELETE /api/products/:id',
      'GET /api/track/:id',
      'GET /health'
    ],
    timestamp: new Date().toISOString()
  });
});

export default app;