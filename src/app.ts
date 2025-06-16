import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import productRoutes from './routes/product.routes';
import healthRouter from './routes/health.routes'; // ✅ Route /health ajoutée

// 🌍 Charge les variables d'environnement depuis .env
dotenv.config();

const app: Application = express();

// 🔐 Middlewares globaux
app.use(cors());
app.use(helmet());
app.use(express.json());

// 📦 Routes API
app.use('/api', productRoutes);
app.use('/', healthRouter); // ✅ Enregistre la route de santé

// 📋 Route d'information API
app.get('/', (req, res) => {
  res.json({
    message: "Ecolojia API",
    version: "1.0.0", 
    status: "operational",
    endpoints: [
      "GET /api/products",
      "GET /api/products/:slug",
      "POST /api/products",
      "PUT /api/products/:id", 
      "DELETE /api/products/:id",
      "GET /api/products/search",
      "GET /api/products/stats",
      "GET /health"
    ],
    documentation: "https://github.com/ecojiaflow/ecolojia-backendV1",
    timestamp: new Date().toISOString()
  });
});

// 🚀 Démarrage serveur
const PORT: number = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`🌱 Serveur Ecolojia démarré sur http://localhost:${PORT}`);
  console.log(`📋 Documentation API: http://localhost:${PORT}/`);
  console.log(`💚 Santé API: http://localhost:${PORT}/health`);
});

// Pour tests éventuels
export default app;