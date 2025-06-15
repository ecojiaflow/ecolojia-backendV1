/* ---------------------------------------------------------
 *  Ecolojia – API backend  (index.js)
 *  Version sécurité + logs structurés Winston
 *  15 juin 2025
 * --------------------------------------------------------*/

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient, ConfidenceColor, VerifiedStatus } = require('@prisma/client');
const fetch = require('node-fetch');
const { execSync } = require('child_process');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { logger, logMiddleware } = require('./src/logger'); // ✅ nouveau

dotenv.config();

const app = express();
const prisma = new PrismaClient();

/* ---------- Middlewares globaux ---------- */
app.use(helmet());                 // Sécurité headers
app.use(cors());                  // CORS
app.use(express.json());          // JSON body
app.use(logMiddleware);           // ✅ Winston logger

// Limite générale : 100 req / 15 min
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

/* ---------- Schéma Zod pour produits ---------- */
const productSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  slug: z.string().min(3),
  brand: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  images: z.array(z.string()).optional(),
  zones_dispo: z.array(z.string()).min(1),
  prices: z.any().optional(),
  affiliate_url: z.string().url().optional(),
  eco_score: z.number().min(0).max(5).nullable().optional(),
  ai_confidence: z.number().min(0).max(1).nullable().optional(),
  confidence_pct: z.number().min(0).max(100).nullable().optional(),
  confidence_color: z.enum(['green', 'yellow', 'red']).nullable().optional(),
  verified_status: z.enum(['verified', 'manual_review', 'rejected']).optional(),
  resume_fr: z.string().optional(),
  resume_en: z.string().optional(),
  enriched_at: z.string().datetime().optional(),
  created_at: z.string().datetime().optional()
});

/* ---------- ROUTES PRODUITS ---------- */

app.get('/api/prisma/products', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { created_at: 'desc' } });
    res.json(products);
  } catch (error) {
    logger.error('GET /products', { error: error.message }); // ✅ log erreur
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/products/:slug', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({ where: { slug: req.params.slug } });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (error) {
    logger.error('GET /products/:slug', { error: error.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/prisma/products', async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('Validation échouée', parsed.error.flatten());
    return res.status(422).json({ error: parsed.error.flatten() });
  }
  const data = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        id: data.id,
        title: data.title,
        description: data.description,
        slug: data.slug,
        brand: data.brand,
        category: data.category,
        tags: data.tags,
        images: data.images,
        zones_dispo: data.zones_dispo,
        prices: data.prices,
        affiliate_url: data.affiliate_url,
        eco_score: data.eco_score,
        ai_confidence: data.ai_confidence,
        confidence_pct: data.confidence_pct,
        confidence_color: ConfidenceColor[data.confidence_color] || ConfidenceColor.yellow,
        verified_status: VerifiedStatus[data.verified_status] || VerifiedStatus.manual_review,
        resume_fr: data.resume_fr,
        resume_en: data.resume_en,
        enriched_at: data.enriched_at ? new Date(data.enriched_at) : undefined,
        created_at: data.created_at ? new Date(data.created_at) : undefined
      }
    });
    res.status(201).json(product);
  } catch (error) {
    logger.error('POST /products', { error: error.message });
    res.status(400).json({ error: 'Erreur ajout produit' });
  }
});

/* ---------- ROUTE IA / SUGGEST ---------- */
app.post('/api/suggest', rateLimit({ windowMs: 60 * 1000, max: 5 }), async (req, res) => {
  try {
    const { query, zone, lang } = req.body;
    if (!query || !zone || !lang) return res.status(400).json({ error: 'query, zone and lang required' });

    const response = await fetch(process.env.N8N_SUGGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, zone, lang })
    });

    const result = await response.json();
    res.json(result);
  } catch (err) {
    logger.error('POST /suggest', { error: err.message });
    res.status(500).json({ error: 'Erreur suggestion IA' });
  }
});

/* ---------- ROUTES UTILITAIRES ---------- */
app.get('/', (_req, res) => res.send('Hello from Ecolojia backend!'));
app.get('/health', (_req, res) => res.json({ status: 'up' }));

app.get('/init-db', async (_req, res) => {
  try {
    execSync('npx prisma db push');
    res.send('✅ Base de données synchronisée.');
  } catch (error) {
    logger.error('GET /init-db', { error: error.message });
    res.status(500).send('Erreur db push');
  }
});

/* ---------- LANCEMENT SERVEUR ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`✅ API running on port ${PORT}`));

