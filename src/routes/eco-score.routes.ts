// Routes pour le système de score écologique IA
import { Router, Request, Response } from 'express';
import { EcoScoreService } from '../services/eco-score.service';

const router = Router();

/**
 * POST /api/eco-score/update-all
 * Met à jour tous les scores écologiques avec l'IA
 */
router.post('/eco-score/update-all', async (req: Request, res: Response) => {
  try {
    console.log('🌱 Démarrage mise à jour globale des eco_scores...');
    
    const result = await EcoScoreService.updateAllEcoScores();
    
    res.json({
      success: true,
      message: `Scores écologiques mis à jour avec succès`,
      stats: {
        updated: result.updated,
        errors: result.errors,
        total: result.updated + result.errors
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur update-all eco-scores:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des scores',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/eco-score/update/:productId
 * Met à jour le score d'un produit spécifique
 */
router.post('/eco-score/update/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'ID produit requis'
      });
    }
    
    console.log(`🌱 Mise à jour eco_score pour produit: ${productId}`);
    
    const ecoScore = await EcoScoreService.updateProductEcoScore(productId);
    
    res.json({
      success: true,
      message: 'Score écologique mis à jour',
      data: {
        productId,
        eco_score: ecoScore,
        eco_score_percentage: Math.round(ecoScore * 100)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Erreur update eco-score produit ${req.params.productId}:`, error);
    
    if (error instanceof Error && error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'Produit non trouvé'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du score',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/eco-score/calculate
 * Calcule le score d'un produit sans l'enregistrer
 */
router.post('/eco-score/calculate', async (req: Request, res: Response) => {
  try {
    const { title, description, brand, category, tags } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Titre et description requis',
        required_fields: ['title', 'description'],
        optional_fields: ['brand', 'category', 'tags']
      });
    }
    
    console.log(`🌱 Calcul eco_score pour: ${title}`);
    
    const ecoScore = await EcoScoreService.calculateEcoScore({
      title,
      description,
      brand: brand || '',
      category: category || '',
      tags: Array.isArray(tags) ? tags : []
    });
    
    res.json({
      success: true,
      message: 'Score écologique calculé',
      data: {
        eco_score: ecoScore,
        eco_score_percentage: Math.round(ecoScore * 100),
        product_preview: {
          title,
          brand: brand || 'Non spécifié',
          category: category || 'Non spécifié'
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur calcul eco-score:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul du score',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/eco-score/stats
 * Statistiques des scores écologiques
 */
router.get('/eco-score/stats', async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const [
      totalProducts,
      avgScore,
      scoreDistribution,
      recentUpdates
    ] = await Promise.all([
      // Total des produits
      prisma.product.count(),
      
      // Score moyen
      prisma.product.aggregate({
        _avg: { eco_score: true }
      }),
      
      // Distribution des scores
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN eco_score >= 0.8 THEN 'Excellent (80-100%)'
            WHEN eco_score >= 0.6 THEN 'Très bon (60-79%)'
            WHEN eco_score >= 0.4 THEN 'Bon (40-59%)'
            WHEN eco_score >= 0.2 THEN 'Moyen (20-39%)'
            ELSE 'Faible (0-19%)'
          END as score_range,
          COUNT(*) as count
        FROM "Product" 
        WHERE eco_score IS NOT NULL
        GROUP BY score_range
        ORDER BY MIN(eco_score) DESC
      `,
      
      // Mises à jour récentes
      prisma.product.findMany({
        where: {
          enriched_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
          }
        },
        select: {
          id: true,
          title: true,
          eco_score: true,
          enriched_at: true
        },
        orderBy: { enriched_at: 'desc' },
        take: 10
      })
    ]);
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      data: {
        overview: {
          total_products: totalProducts,
          average_score: avgScore._avg.eco_score || 0,
          average_percentage: Math.round((avgScore._avg.eco_score || 0) * 100)
        },
        distribution: scoreDistribution,
        recent_updates: recentUpdates.map(product => ({
          ...product,
          eco_score_percentage: Math.round((product.eco_score || 0) * 100)
        }))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur stats eco-score:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * GET /api/eco-score/test
 * Test rapide du service
 */
router.get('/eco-score/test', async (req: Request, res: Response) => {
  try {
    const testProduct = {
      title: 'Savon Bio Artisanal',
      description: 'Savon naturel à base d\'huile d\'olive bio, fabriqué en France, certifié Ecocert, zéro déchet',
      brand: 'Savonnerie Française',
      category: 'Cosmétiques',
      tags: ['bio', 'naturel', 'artisanal', 'zéro-déchet']
    };
    
    console.log('🧪 Test du service EcoScore...');
    
    const ecoScore = await EcoScoreService.calculateEcoScore(testProduct);
    
    res.json({
      success: true,
      message: 'Test du service EcoScore réussi',
      test_product: testProduct,
      calculated_score: {
        eco_score: ecoScore,
        eco_score_percentage: Math.round(ecoScore * 100)
      },
      service_status: 'Opérationnel',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur test eco-score:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test du service',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;