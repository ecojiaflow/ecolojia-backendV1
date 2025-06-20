// ✅ FICHIER CORRIGÉ : src/routes/eco-score.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { EcoScoreService } from '../services/eco-score.service';

const router = Router();

// Middleware d'authentification pour les tâches cron
const cronAuth = (req: Request, res: Response, next: NextFunction) => {
  const cronKey = req.headers['x-cron-key'] as string;
  const expectedKey = process.env.CRON_KEY;

  console.log('🔐 Auth cron - Clé reçue:', cronKey ? 'présente' : 'absente');
  console.log('🔐 Auth cron - Clé attendue:', expectedKey ? 'configurée' : 'manquante');

  if (!expectedKey) {
    console.error('❌ CRON_KEY manquante dans l\'environnement');
    return res.status(500).json({ 
      success: false, 
      error: 'Configuration serveur manquante',
      debug: 'CRON_KEY non définie'
    });
  }

  if (!cronKey) {
    console.error('❌ Header x-cron-key manquant');
    return res.status(401).json({ 
      success: false, 
      error: 'Clé d\'authentification manquante',
      debug: 'Header x-cron-key requis'
    });
  }

  if (cronKey !== expectedKey) {
    console.error('❌ Clé d\'authentification invalide');
    return res.status(401).json({ 
      success: false, 
      error: 'Clé d\'authentification invalide',
      debug: 'x-cron-key incorrecte'
    });
  }

  console.log('✅ Authentification cron réussie');
  next();
};

/**
 * POST /api/eco-score/update-all
 * Route pour le cron nocturne - met à jour tous les eco_scores
 * PROTECTION: Nécessite header x-cron-key
 */
router.post('/update-all', cronAuth, async (req: Request, res: Response) => {
  try {
    console.log('🌱 [CRON] Démarrage mise à jour globale des eco_scores...');
    const startTime = Date.now();
    
    const result = await EcoScoreService.updateAllEcoScores();
    
    const duration = Date.now() - startTime;
    const message = `✅ [CRON] Mise à jour terminée en ${duration}ms`;
    
    console.log(message);
    console.log(`📊 Résultats: ${result.updated} mis à jour, ${result.errors} erreurs`);

    res.json({
      success: true,
      message: 'Scores écologiques mis à jour avec succès',
      stats: {
        updated: result.updated,
        errors: result.errors,
        total: result.updated + result.errors,
        duration_ms: duration
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ [CRON] Erreur mise à jour globale:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des scores',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/eco-score/update/:productId
 * Mise à jour d'un seul produit (pour tests/debug)
 */
router.post('/update/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'ID produit requis' });
    }

    console.log(`🌱 Mise à jour eco_score pour produit: ${productId}`);
    const ecoScore = await EcoScoreService.updateProductEcoScore(productId);

    res.json({
      success: true,
      message: 'Score écologique mis à jour',
      data: {
        productId,
        eco_score: ecoScore,
        eco_score_percentage: Math.round(Number(ecoScore) * 100)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Erreur update eco-score produit ${req.params.productId}:`, error);
    if (error instanceof Error && error.message.includes('non trouvé')) {
      return res.status(404).json({ success: false, error: 'Produit non trouvé' });
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
 * Calcul direct d'un score (pour tests/preview)
 */
router.post('/calculate', async (req: Request, res: Response) => {
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
        eco_score_percentage: Math.round(Number(ecoScore) * 100),
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
 * GET /api/eco-score/test
 * Test du service (sans auth)
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    const testProduct = {
      title: 'Savon Bio Artisanal Test',
      description: 'Savon naturel à base d\'huile d\'olive bio, fabriqué en France, certifié Ecocert, zéro déchet',
      brand: 'Savonnerie Test',
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
        eco_score_percentage: Math.round(Number(ecoScore) * 100)
      },
      service_status: 'Opérationnel',
      environment_check: {
        cron_key_configured: !!process.env.CRON_KEY,
        node_env: process.env.NODE_ENV || 'development'
      },
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