import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EcoScoreService } from '../services/eco-score.service';

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/products
 */
router.get('/products', async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

/**
 * GET /api/products/search
 */
router.get('/products/search', async (_req: Request, res: Response) => {
  // TODO: Ajouter filtres, pagination
  const products = await prisma.product.findMany();
  res.json(products);
});

/**
 * GET /api/products/stats
 */
router.get('/products/stats', async (_req: Request, res: Response) => {
  const count = await prisma.product.count();
  const avg = await prisma.product.aggregate({ _avg: { eco_score: true } });
  res.json({ count, average_score: avg._avg.eco_score });
});

/**
 * GET /api/products/:slug
 */
router.get('/products/:slug', async (req: Request, res: Response) => {
  const slug = req.params.slug;
  const product = await prisma.product.findFirst({ where: { slug } });

  if (!product) {
    return res.status(404).json({ error: 'Produit non trouvé' });
  }

  res.json(product);
});

/**
 * POST /api/products
 */
router.post('/products', async (req: Request, res: Response) => {
  try {
    const { title, description, brand, category, tags = [], ...rest } = req.body;

    // Validation minimale
    if (!title || !description) {
      return res.status(400).json({ error: 'Titre et description requis' });
    }

    // 🧠 Calcul IA du score écologique
    const eco_score = await EcoScoreService.calculateEcoScore({
      title,
      description,
      brand,
      category,
      tags
    });

    // 🕒 Date d’enrichissement
    const enriched_at = new Date();

    // 🔠 Slug auto à partir du titre
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // enlever accents
      .replace(/[^a-z0-9]+/g, '-') // remplacer par tirets
      .replace(/(^-|-$)/g, ''); // supprimer tirets début/fin

    // Création produit
    const product = await prisma.product.create({
      data: {
        title,
        slug,
        description,
        brand,
        category,
        tags,
        eco_score,
        enriched_at,
        ...rest
      }
    });

    res.status(201).json({
      message: 'Produit créé avec succès',
      data: {
        ...product,
        eco_score_percentage: Math.round(Number(eco_score) * 100)
      }
    });
  } catch (error) {
    console.error('❌ Erreur création produit:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du produit',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * PUT /api/products/:id
 */
router.put('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const updated = await prisma.product.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur mise à jour', message: String(error) });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur suppression', message: String(error) });
  }
});

export default router;
