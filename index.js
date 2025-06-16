/* ---------------------------------------------------------
 *  Ecolojia – API backend complet (tracking + affiliation)
 *  Version corrigée complète – 16 juin 2025
 * --------------------------------------------------------*/

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const { execSync } = require('child_process');
const { z } = require('zod');
const {
  PrismaClient,
  ConfidenceColor,
  VerifiedStatus
} = require('@prisma/client');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

/* ---------- Logger simple (sans fichier externe) ---------- */
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

/* ---------- Sécurité & middlewares ---------- */
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting général (désactivé pendant les tests)
const isTestMode = process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test';

if (!isTestMode) {
  const generalLimit = rateLimit({ 
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Trop de requêtes, réessayez dans 15 minutes' }
  });
  app.use(generalLimit);
  console.log('✅ Rate limiting activé');
} else {
  console.log('⚠️ Rate limiting désactivé (mode test)');
}

/* ---------- Middleware d'authentification ---------- */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Clé API requise',
      code: 'MISSING_API_KEY' 
    });
  }

  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ 
      error: 'Clé API invalide',
      code: 'INVALID_API_KEY' 
    });
  }

  next();
};

/* ---------- Zod Schemas ---------- */
const productSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  slug: z.string().min(3).optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).max(10).default([]),
  images: z.array(z.string()).default([]),
  zones_dispo: z.array(z.string()).min(1),
  prices: z.any().optional(),
  affiliate_url: z.string().url().optional(),
  eco_score: z.number().min(0).max(5).nullable().optional(),
  ai_confidence: z.number().min(0).max(1).nullable().optional(),
  confidence_pct: z.number().min(0).max(100).nullable().optional(),
  confidence_color: z.enum(['green', 'yellow', 'red']).nullable().optional(),
  verified_status: z.enum(['verified', 'manual_review', 'rejected']).optional()
});

const partnerSchema = z.object({
  name: z.string().min(2).max(100),
  website: z.string().url().optional(),
  commission_rate: z.number().min(0).max(1).default(0.05),
  ethical_score: z.number().min(0).max(5).default(3.0),
  active: z.boolean().default(true)
});

const partnerLinkSchema = z.object({
  product_id: z.string().uuid('ID produit doit être un UUID valide'),
  partner_id: z.string().uuid('ID partenaire doit être un UUID valide'),
  url: z.string().url('URL doit être valide'),
  tracking_id: z.string().optional(),
  commission_rate: z.number().min(0).max(1).default(0.05),
  active: z.boolean().default(true)
});

/* ---------- Routes Produits ---------- */
app.get('/api/prisma/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { created_at: 'desc' },
      include: { 
        partnerLinks: { 
          where: { active: true },
          select: { id: true, url: true } 
        } 
      }
    });
    res.json(products);
  } catch (error) {
    logger.error('Erreur récupération produits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/products/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug || slug.trim() === '') {
      return res.status(400).json({ 
        error: 'ID produit requis',
        code: 'MISSING_PRODUCT_ID' 
      });
    }

    const slugTrimmed = slug.trim();
    
    // Rechercher par ID ou par slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: slugTrimmed },
          { slug: slugTrimmed }
        ]
      },
      include: { 
        partnerLinks: { 
          where: { active: true },
          include: {
            partner: {
              select: { 
                id: true,
                name: true,
                website: true,
                commission_rate: true,
                ethical_score: true
              }
            }
          }
        } 
      }
    });

    if (!product) {
      return res.status(404).json({ 
        error: 'Produit non trouvé',
        code: 'PRODUCT_NOT_FOUND',
        productId: slug 
      });
    }

    res.json({
      ...product,
      eco_score: product.eco_score ? parseFloat(product.eco_score) : null,
      ai_confidence: product.ai_confidence ? parseFloat(product.ai_confidence) : null
    });

  } catch (error) {
    logger.error('Erreur récupération produit:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération du produit',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// ✅ NOUVELLE ROUTE POST /api/products (SANS AUTHENTIFICATION)
app.post('/api/products', async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      slug,
      brand,
      category,
      tags,
      images,
      zones_dispo,
      prices,
      affiliate_url,
      eco_score,
      ai_confidence,
      confidence_pct,
      confidence_color,
      verified_status,
      resume_fr,
      resume_en,
      source,
      external_id
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ 
        error: 'Champs requis manquants',
        required: ['title', 'description']
      });
    }

    const generatedSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) + `-${Date.now()}`;

    const product = await prisma.product.create({
      data: {
        id: id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        slug: generatedSlug,
        brand: brand || null,
        category: category || 'general',
        tags: Array.isArray(tags) ? tags : [],
        images: Array.isArray(images) ? images : [],
        zones_dispo: Array.isArray(zones_dispo) ? zones_dispo : ['FR'],
        prices: prices || {},
        affiliate_url: affiliate_url || null,
        eco_score: parseFloat(eco_score) || 0.5,
        ai_confidence: parseFloat(ai_confidence) || 0.5,
        confidence_pct: parseInt(confidence_pct) || 50,
        confidence_color: confidence_color || 'orange',
        verified_status: verified_status || 'manual_review',
        resume_fr: resume_fr || '',
        resume_en: resume_en || '',
        source: source || 'manual',
        external_id: external_id || null
      },
      include: {
        partnerLinks: {
          include: { partner: true }
        }
      }
    });

    console.log(`✅ Produit créé: ${product.title}`);
    res.status(201).json(product);

  } catch (error) {
    console.error('❌ Erreur création produit:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Produit existe déjà',
        field: error.meta?.target?.[0] || 'slug'
      });
    }
    
    res.status(500).json({ 
      error: 'Erreur création produit',
      details: error.message 
    });
  }
});

app.post('/api/prisma/products', validateApiKey, async (req, res) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: parsed.error.flatten() 
      });
    }

    const data = parsed.data;
    
    // Générer slug si pas fourni
    if (!data.slug) {
      data.slug = data.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        confidence_color: data.confidence_color || 'yellow',
        verified_status: data.verified_status || 'manual_review'
      }
    });

    logger.info(`Produit créé: ${product.title}`);
    res.status(201).json(product);
  } catch (error) {
    logger.error('Erreur création produit:', error);
    res.status(400).json({ error: 'Erreur lors de la création du produit' });
  }
});

/* ---------- Route IA Suggestion ---------- */
const suggestLimit = rateLimit({ 
  windowMs: 60 * 1000, // 1 minute
  max: isTestMode ? 1000 : 5, // Plus permissif en test
  message: { error: 'Limite de suggestions atteinte, réessayez dans 1 minute' }
});

app.post('/api/suggest', isTestMode ? [] : suggestLimit, async (req, res) => {
  try {
    const { query, zone, lang } = req.body;
    
    if (!query || !zone || !lang) {
      return res.status(400).json({ 
        error: 'Paramètres query, zone et lang requis' 
      });
    }

    if (!process.env.N8N_SUGGEST_URL) {
      return res.status(503).json({ 
        error: 'Service d\'enrichissement non configuré' 
      });
    }

    const response = await fetch(process.env.N8N_SUGGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, zone, lang })
    });

    if (!response.ok) {
      throw new Error(`N8N responded with ${response.status}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    logger.error('Erreur suggestion IA:', error);
    res.status(500).json({ error: 'Erreur lors de la suggestion IA' });
  }
});

/* ======================================================
 *                  AFFILIATION
 * ====================================================== */

/* ---------- GET /api/partners ---------- */
app.get('/api/partners', async (req, res) => {
  try {
    const partners = await prisma.partner.findMany({
      where: { active: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(partners);
  } catch (error) {
    logger.error('Erreur récupération partenaires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ---------- POST /api/partners ---------- */
app.post('/api/partners', validateApiKey, async (req, res) => {
  try {
    const parsed = partnerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: parsed.error.flatten() 
      });
    }

    const newPartner = await prisma.partner.create({ 
      data: parsed.data 
    });
    
    logger.info(`Partenaire créé: ${newPartner.name}`);
    res.status(201).json(newPartner);
  } catch (error) {
    logger.error('Erreur création partenaire:', error);
    res.status(500).json({ error: 'Erreur lors de la création du partenaire' });
  }
});

/* ---------- POST /api/partner-links ---------- */
app.post('/api/partner-links', validateApiKey, async (req, res) => {
  try {
    const parsed = partnerLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Données invalides',
        details: parsed.error.flatten()
      });
    }

    const data = parsed.data;

    // Vérifier que le partenaire existe
    const partner = await prisma.partner.findUnique({
      where: { id: data.partner_id }
    });
    
    if (!partner) {
      logger.warn(`Partenaire non trouvé: ${data.partner_id}`);
      return res.status(404).json({
        error: 'Partenaire non trouvé',
        code: 'PARTNER_NOT_FOUND',
        partner_id: data.partner_id
      });
    }

    // Vérifier que le produit existe
    const product = await prisma.product.findUnique({
      where: { id: data.product_id }
    });
    
    if (!product) {
      logger.warn(`Produit non trouvé: ${data.product_id}`);
      return res.status(404).json({
        error: 'Produit non trouvé',
        code: 'PRODUCT_NOT_FOUND',
        product_id: data.product_id
      });
    }

    logger.info(`Validation OK - Produit: ${product.title}, Partenaire: ${partner.name}`);

    // Vérifier si un lien existe déjà
    const existingLink = await prisma.partnerLink.findFirst({
      where: {
        product_id: data.product_id,
        partner_id: data.partner_id
      }
    });

    let partnerLink;

    if (existingLink) {
      // Mise à jour
      partnerLink = await prisma.partnerLink.update({
        where: { id: existingLink.id },
        data: data,
        include: {
          product: { select: { title: true } },
          partner: { select: { name: true } }
        }
      });
      
      res.json({
        success: true,
        action: 'updated',
        partnerLink
      });
    } else {
      // Création
      partnerLink = await prisma.partnerLink.create({
        data: data,
        include: {
          product: { select: { title: true } },
          partner: { select: { name: true } }
        }
      });
      
      res.status(201).json({
        success: true,
        action: 'created',
        partnerLink
      });
    }

    logger.info(`Lien ${existingLink ? 'mis à jour' : 'créé'}: ${partnerLink.product.title} -> ${partnerLink.partner.name}`);

  } catch (error) {
    logger.error('Erreur création partner link:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ---------- GET /api/partner-links ---------- */
app.get('/api/partner-links', validateApiKey, async (req, res) => {
  try {
    const { product_id, partner_id, active } = req.query;
    
    const where = {};
    if (product_id) where.product_id = product_id;
    if (partner_id) where.partner_id = partner_id;
    if (active !== undefined) where.active = active === 'true';

    const partnerLinks = await prisma.partnerLink.findMany({
      where,
      include: {
        product: { select: { id: true, title: true } },
        partner: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      count: partnerLinks.length,
      partnerLinks
    });

  } catch (error) {
    logger.error('Erreur récupération partner links:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ---------- GET /api/track/:linkId ---------- */
app.get('/api/track/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;

    logger.info(`Tentative de tracking pour: ${linkId}`);

    // Rechercher le lien avec les relations
    const link = await prisma.partnerLink.findUnique({
      where: { id: linkId },
      include: {
        partner: { select: { name: true } },
        product: { select: { title: true } }
      }
    });

    if (!link) {
      logger.warn(`Lien affilié introuvable: ${linkId}`);
      return res.status(404).json({ error: 'Lien affilié introuvable' });
    }

    if (!link.active) {
      logger.warn(`Lien affilié inactif: ${linkId}`);
      return res.status(404).json({ error: 'Lien affilié inactif' });
    }

    // Incrémenter le compteur de clics
    await prisma.partnerLink.update({
      where: { id: linkId },
      data: { clicks: { increment: 1 } }
    });

    logger.info(`Redirection vers: ${link.url} (${link.partner.name}) - nouveau total clicks: ${link.clicks + 1}`);
    
    // Redirection 302 vers l'URL du partenaire
    return res.redirect(302, link.url);
    
  } catch (error) {
    logger.error('Erreur tracking:', error.message);
    logger.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors du tracking',
      code: 'TRACKING_ERROR'
    });
  }
});

/* ---------- Routes utilitaires ---------- */
app.get('/', (req, res) => {
  res.json({ 
    message: 'Ecolojia API',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'GET /api/products/:slug',
      'POST /api/products',
      'GET /api/partners',
      'GET /api/track/:linkId',
      'GET /health'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'up',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/init-db', validateApiKey, async (req, res) => {
  try {
    execSync('npx prisma db push', { stdio: 'inherit' });
    res.json({ 
      success: true,
      message: 'Base de données synchronisée' 
    });
  } catch (error) {
    logger.error('Erreur db push:', error);
    res.status(500).json({ error: 'Erreur lors de la synchronisation' });
  }
});

/* ---------- Gestion erreurs globales ---------- */
app.use((err, req, res, next) => {
  logger.error('Erreur non gérée:', err);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    code: 'ROUTE_NOT_FOUND',
    path: req.path
  });
});

/* ---------- Lancement serveur ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Ecolojia API démarrée sur le port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, arrêt propre...');
  await prisma.$disconnect();
  process.exit(0);
});