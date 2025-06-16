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
            partner: true, // ✅ inclure partenaire dans liste d'accueil aussi
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
 * Retourne un produit par son slug (ex: savon-alep-artisanal)
 */
export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: {
        slug, // ✅ utilise directement le champ slug (doit être @unique dans Prisma)
      },
      include: {
        partnerLinks: {
          include: {
            partner: true, // ✅ inclure partenaire dans la fiche produit
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

    // Validation requise
    if (!title || !description) {
      res.status(400).json({ 
        error: 'Champs requis manquants',
        required: ['title', 'description']
      });
      return;
    }

    // Génération slug automatique si pas fourni
    const generatedSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) + `-${Date.now()}`;

    // Création produit
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

    // Suppression (les relations seront supprimées en cascade si configuré)
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
      q,           // terme de recherche
      category,    // filtrage par catégorie
      verified,    // produits vérifiés uniquement
      eco_min,     // score éco minimum
      page = 1,    // pagination
      limit = 20   // limite par page
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
          { verified_status: 'desc' }, // Produits vérifiés en premier
          { eco_score: 'desc' },       // Puis par score éco
          { created_at: 'desc' }       // Puis par date
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
      // Total produits
      prisma.product.count(),
      
      // Produits vérifiés
      prisma.product.count({
        where: { verified_status: 'verified' }
      }),
      
      // Score éco moyen
      prisma.product.aggregate({
        _avg: { eco_score: true }
      }),
      
      // Top catégories
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