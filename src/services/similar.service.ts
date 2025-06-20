// ✅ FICHIER COMPLET : src/services/similar.service.ts

import { productsIndex, AlgoliaProduct, defaultSearchParams } from '../lib/algolia';
import deepSeekClient from '../lib/deepseek';
import { prisma } from '../lib/prisma';

interface SimilarProduct {
  id: string;
  title: string;
  description: string;
  brand?: string;
  category: string;
  eco_score: number;
  images: string[];
  slug: string;
  source: 'algolia' | 'ai';
}

export class SimilarService {
  /**
   * Trouve des produits similaires en combinant Algolia + IA
   */
  static async findSimilarProducts(productId: string, limit: number = 6): Promise<SimilarProduct[]> {
    try {
      console.log(`🔍 Recherche de produits similaires pour: ${productId}`);

      // 1. Récupérer le produit source
      const sourceProduct = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          title: true,
          description: true,
          brand: true,
          category: true,
          tags: true,
          eco_score: true
        }
      });

      if (!sourceProduct) {
        throw new Error(`Produit ${productId} non trouvé`);
      }

      // 2. Recherche Algolia avec similarQuery
      const algoliaResults = await this.searchWithAlgolia(sourceProduct, limit);
      console.log(`🟢 Algolia: ${algoliaResults.length} résultats trouvés`);

      // 3. Si pas assez de résultats, compléter avec l'IA
      let results = algoliaResults;
      if (results.length < 3) {
        console.log(`🧠 Fallback IA: seulement ${results.length} résultats Algolia`);
        const aiResults = await this.searchWithAI(sourceProduct, limit - results.length);
        console.log(`🟡 IA: ${aiResults.length} résultats supplémentaires`);
        
        // Déduplication par ID
        const existingIds = new Set(results.map(p => p.id));
        const uniqueAiResults = aiResults.filter(p => !existingIds.has(p.id));
        
        results = [...results, ...uniqueAiResults];
      }

      // 4. Trier par eco_score descendant et limiter
      const finalResults = results
        .sort((a, b) => (b.eco_score || 0) - (a.eco_score || 0))
        .slice(0, limit);

      console.log(`✅ Total final: ${finalResults.length} produits similaires`);
      return finalResults;

    } catch (error) {
      console.error('❌ Erreur recherche produits similaires:', error);
      // Fallback complet vers l'IA en cas d'erreur Algolia
      return this.searchWithAI(productId, limit);
    }
  }

  /**
   * Recherche avec Algolia similarQuery
   */
  private static async searchWithAlgolia(
    sourceProduct: any, 
    limit: number
  ): Promise<SimilarProduct[]> {
    try {
      // Construire la requête de similarité
      const searchQuery = `${sourceProduct.title} ${sourceProduct.brand || ''} ${sourceProduct.category}`.trim();
      
      const searchParams = {
        ...defaultSearchParams,
        hitsPerPage: limit + 2, // +2 pour compenser le produit source et les doublons
        similarQuery: searchQuery,
        filters: `NOT objectID:${sourceProduct.id}`, // Exclure le produit source
        facetFilters: [
          `category:${sourceProduct.category}` // Privilégier la même catégorie
        ]
      };

      const searchResult = await productsIndex.search('', searchParams);

      return searchResult.hits.map((hit: any) => ({
        id: hit.id || hit.objectID,
        title: hit.title || '',
        description: hit.description || '',
        brand: hit.brand,
        category: hit.category || '',
        eco_score: hit.eco_score || 0,
        images: hit.images || [],
        slug: hit.slug || '',
        source: 'algolia' as const
      }));

    } catch (error) {
      console.error('❌ Erreur recherche Algolia:', error);
      return [];
    }
  }

  /**
   * Recherche avec IA DeepSeek (fallback)
   */
  private static async searchWithAI(
    sourceProduct: any, 
    limit: number
  ): Promise<SimilarProduct[]> {
    try {
      // Si on reçoit juste un ID, récupérer le produit complet
      let product = sourceProduct;
      if (typeof sourceProduct === 'string') {
        product = await prisma.product.findUnique({
          where: { id: sourceProduct },
          select: {
            id: true,
            title: true,
            description: true,
            brand: true,
            category: true,
            tags: true
          }
        });
        if (!product) return [];
      }

      // Prompt optimisé pour DeepSeek
      const prompt = `Trouve des produits similaires écologiques à: "${product.title}"
Catégorie: ${product.category}
Marque: ${product.brand || 'Non spécifiée'}
Description: ${product.description}

Génère ${limit} suggestions de produits écoresponsables similaires avec:
- Nom du produit réaliste
- Marque crédible
- Description écologique (50 mots max)
- Score éco 60-90%

Format JSON uniquement:
[{"title":"...","brand":"...","description":"...","eco_score":0.75}]`;

      console.log('🧠 Appel IA DeepSeek pour suggestions similaires...');
      const aiResponse = await deepSeekClient.getSimilar(product);
      
      if (!aiResponse || aiResponse.length === 0) {
        console.log('🧠 Suggestions IA simulées pour :', product.title);
        return this.getFallbackSuggestions(product, limit);
      }

      // Utiliser directement la réponse du client DeepSeek
      return aiResponse.slice(0, limit).map((suggestion: any, index: number) => ({
        id: `ai_similar_${product.id}_${index}`,
        title: suggestion.title || suggestion.name || `Produit similaire ${index + 1}`,
        description: suggestion.description || 'Produit écologique similaire',
        brand: suggestion.brand || 'Marque éco',
        category: product.category,
        eco_score: suggestion.eco_score || 0.6,
        images: [],
        slug: `ai-${(suggestion.title || `produit-${index}`).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        source: 'ai' as const
      }));

    } catch (error) {
      console.error('❌ Erreur recherche IA:', error);
      return this.getFallbackSuggestions(sourceProduct, limit);
    }
  }

  /**
   * Suggestions de base (si tout échoue)
   */
  private static getFallbackSuggestions(product: any, limit: number): SimilarProduct[] {
    const fallbacks = [
      {
        title: `Alternative éco à ${product.title}`,
        brand: 'EcoChoice',
        description: 'Produit écologique alternatif avec certification bio et emballage recyclable.',
        eco_score: 0.75
      },
      {
        title: `${product.category} durable premium`,
        brand: 'GreenLife',
        description: 'Version améliorée et plus respectueuse de l\'environnement.',
        eco_score: 0.8
      },
      {
        title: `Bio ${product.category.toLowerCase()}`,
        brand: 'NaturalBest',
        description: 'Produit 100% naturel, fabriqué localement avec des matières premières durables.',
        eco_score: 0.7
      }
    ];

    return fallbacks.slice(0, limit).map((fallback, index) => ({
      id: `fallback_${product.id}_${index}`,
      title: fallback.title,
      description: fallback.description,
      brand: fallback.brand,
      category: product.category,
      eco_score: fallback.eco_score,
      images: [],
      slug: `fallback-${fallback.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      source: 'ai' as const
    }));
  }
}