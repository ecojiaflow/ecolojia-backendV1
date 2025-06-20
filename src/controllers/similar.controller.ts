// ✅ FICHIER COMPLET CORRIGÉ : src/controllers/similar.controller.ts

import { Request, Response } from "express";
import { SimilarService } from "../services/similar.service";

/**
 * GET /api/products/:id/similar
 * Récupère des produits similaires via Algolia + IA
 */
export const getSimilarProducts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: "ID produit requis" 
      });
    }

    console.log(`🔍 Recherche produits similaires pour: ${id}`);
    
    // Utilisation du nouveau service avec Algolia + IA
    const similarProducts = await SimilarService.findSimilarProducts(id, 6);

    res.json({
      success: true,
      product_id: id,
      similar_products: similarProducts,
      count: similarProducts.length,
      sources: {
        algolia: similarProducts.filter(p => p.source === 'algolia').length,
        ai: similarProducts.filter(p => p.source === 'ai').length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Erreur getSimilarProducts:", error);
    
    if (error instanceof Error && error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: "Produit non trouvé",
        product_id: req.params.id
      });
    }

    res.status(500).json({
      success: false,
      error: "Erreur lors de la recherche de produits similaires",
      message: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
};