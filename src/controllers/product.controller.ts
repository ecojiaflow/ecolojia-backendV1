import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/products
 * Retourne tous les produits pour la page d'accueil
 */
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        created_at: 'desc',
      },
      include: {
        partnerLinks: {
          include: {
            partner: true,
          },
        },
      },
    });

    res.status(200).json(products);
  } catch (error) {
    console.error('❌ Erreur récupération produits :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * GET /api/products/:slug
 * Retourne un produit par son slug
 */
export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: {
        slug,
      },
      include: {
        partnerLinks: {
          include: {
            partner: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('❌ Erreur récupération produit par slug :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * POST /api/products
 * Crée un nouveau produit
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;

    // Validation de base
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'Corps de requête invalide' });
      return;
    }

    const now = new Date().toISOString();

    // Génération slug automatique si pas fourni
    const generatedSlug = data.slug || 
      `${(data.title || 'produit').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    // Création produit avec valeurs par défaut
    const product = await prisma.product.create({
      data: {
        id: data.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: data.title ?? 'Produit sans titre',
        description: data.description ?? '',
        slug: generatedSlug,
        brand: data.brand ?? null,
        category: data.category ?? 'générique',
        tags: Array.isArray(data.tags) ? data.tags : [],
        images: Array.isArray(data.images) ? data.images : [],
        zones_dispo: Array.isArray(data.zones_dispo) ? data.zones_dispo : ['FR'],
        prices: data.prices ?? {},
        affiliate_url: data.affiliate_url ?? null,
        eco_score: data.eco_score ?? 0.5,
        ai_confidence: data.ai_confidence ?? 0.5,
        confidence_pct: data.confidence_pct ?? 50,
        confidence_color: data.confidence_color ?? 'orange',
        verified_status: data.verified_status ?? 'manual_review',
        resume_fr: data.resume_fr ?? null,
        resume_en: data.resume_en ?? null,
        enriched_at: data.enriched_at ? new Date(data.enriched_at) : new Date(),
        created_at: data.created_at ? new Date(data.created_at) : new Date()
      },
      include: {
        partnerLinks: {
          include: {
            partner: true,
          },
        },
      },
    });

    console.log(`✅ Produit créé: ${product.title}`);
    res.status(201).json(product);

  } catch (error: any) {
    console.error('❌ Erreur création produit:', error);
    
    if (error.code === 'P2002') {
      res.status(409).json({ 
        error: 'Produit existe déjà',
        field: error.meta?.target?.[0] || 'slug'
      });
      return;
    }
    
    res.status(500).json({ 
      error: 'Erreur création produit',
      details: error.message 
    });
  }
};

/**
 * PUT /api/products/:id
 * Met à jour un produit existant
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Vérifier que le produit existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }

    // Mise à jour
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        partnerLinks: {
          include: {
            partner: true,
          },
        },
      },
    });

    console.log(`✅ Produit mis à jour: ${product.title}`);
    res.status(200).json(product);

  } catch (error: any) {
    console.error('❌ Erreur mise à jour:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }
    
    res.status(500).json({ 
      error: 'Erreur mise à jour',
      details: error.message 
    });
  }
};

/**
 * DELETE /api/products/:id
 * Supprime un produit
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Vérifier que le produit existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }

    // Suppression
    await prisma.product.delete({
      where: { id }
    });

    console.log(`✅ Produit supprimé: ${existingProduct.title} (${id})`);
    res.status(200).json({ 
      message: 'Produit supprimé avec succès',
      deletedProduct: {
        id: existingProduct.id,
        title: existingProduct.title
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur suppression:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }
    
    res.status(500).json({ 
      error: 'Erreur suppression',
      details: error.message 
    });
  }
};

/**
 * GET /api/products/search
 * Recherche de produits avec filtres
 */
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      q,           
      category,    
      verified,    
      eco_min,     
      page = 1,    
      limit = 20   
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Construction des filtres
    const where: any = {};

    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
        { brand: { contains: q as string, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (verified === 'true') {
      where.verified_status = 'verified';
    }

    if (eco_min) {
      where.eco_score = { gte: parseFloat(eco_min as string) };
    }

    // Recherche
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: [
          { verified_status: 'desc' },
          { eco_score: 'desc' },
          { created_at: 'desc' }
        ],
        include: {
          partnerLinks: {
            include: {
              partner: true,
            },
          },
        },
      }),
      prisma.product.count({ where })
    ]);

    res.status(200).json({
      products,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      },
      filters: {
        query: q,
        category,
        verified,
        eco_min
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur recherche produits:', error);
    res.status(500).json({ 
      error: 'Erreur recherche',
      details: error.message 
    });
  }
};

/**
 * GET /api/products/stats
 * Statistiques des produits
 */
export const getProductStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      total,
      verified,
      averageEcoScore,
      topCategories
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({
        where: { verified_status: 'verified' }
      }),
      prisma.product.aggregate({
        _avg: { eco_score: true }
      }),
      prisma.product.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 5
      })
    ]);

    res.status(200).json({
      total,
      verified,
      verification_rate: total > 0 ? Math.round((verified / total) * 100) : 0,
      average_eco_score: averageEcoScore._avg.eco_score || 0,
      top_categories: topCategories.map(cat => ({
        category: cat.category,
        count: cat._count.category
      }))
    });

  } catch (error: any) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({ 
      error: 'Erreur statistiques',
      details: error.message 
    });
  }
};