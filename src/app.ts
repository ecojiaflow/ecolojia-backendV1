import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import productRoutes from './routes/product.routes';

// 🌍 Charge les variables d'environnement depuis .env
dotenv.config();

const app: Application = express();

// 🔐 Middlewares globaux
app.use(cors());
app.use(helmet());
app.use(express.json());

// 📦 Routes API
app.use('/api', productRoutes);

// 🚀 Démarrage serveur
const PORT: number = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`🌱 Serveur démarré sur http://localhost:${PORT}`);
});

// Pour tests éventuels
export default app;
