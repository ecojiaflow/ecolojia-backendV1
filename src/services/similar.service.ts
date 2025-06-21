import algoliaIndex, { AlgoliaProduct, defaultSearchParams } from '../lib/algolia'; // ✅ Correction ici
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
  static async findSimilarProducts(productId: string, limit: number = 6): Promise<SimilarProduct[]> {
    try {
      console.log(`🔍 Recherche de produits similaires pour: ${productId}`);

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

      const algoliaResults = await this.searchWithAlgolia(sourceProduct, limit);
      console.log(`🟢 Algolia: ${algoliaResults.length} résultats trouvés`);

      let results = algoliaResults;
      if (results.length < 3) {
        console.log(`🧠 Fallback IA: seulement ${results.length} résultats Algolia`);
        const aiResults = await this.searchWithAI(sourceProduct, limit - results.length);
        console.log(`🟡 IA: ${aiResults.length} résultats supplémentaires`);

        const existingIds = new Set(results.map(p => p.id));
        const uniqueAiResults = aiResults.filter(p => !existingIds.has(p.id));
        results = [...results, ...uniqueAiResults];
      }

      const finalResults = results
        .sort((a, b) => (b.eco_score || 0) - (a.eco_score || 0))
        .slice(0, limit);

      console.log(`✅ Total final: ${finalResults.length} produits similaires`);
      return finalResults;

    } catch (error) {
      console.error('❌ Erreur recherche produits similaires:', error);
      return this.searchWithAI(productId, limit);
    }
  }

  private static async searchWithAlgolia(sourceProduct: any, limit: number): Promise<SimilarProduct[]> {
    try {
      const searchQuery = `${sourceProduct.title} ${sourceProduct.brand || ''} ${sourceProduct.category}`.trim();

      const searchParams = {
        ...defaultSearchParams,
        hitsPerPage: limit + 2,
        similarQuery: searchQuery,
        filters: `NOT objectID:${sourceProduct.id}`,
        facetFilters: [
          `category:${sourceProduct.category}`
        ]
      };

      const searchResult = await algoliaIndex.search('', searchParams);

      return searchResult.hits.map((hit: any) => ({
        id: hit.id || hit.objectID,
        title: hit.title || '',
        description: hit.description || '',
        brand: hit.brand,
        category: hit.category || '',
        eco_score: hit.eco_score || 0,
        images: hit.images || [],
        slug: hit.slug || '',
        source: 'algolia'
      }));
    } catch (error) {
      console.error('❌ Erreur recherche Algolia:', error);
      return [];
    }
  }

  private static async searchWithAI(sourceProduct: any, limit: number): Promise<SimilarProduct[]> {
    try {
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

      return aiResponse.slice(0, limit).map((suggestion: any, index: number) => ({
        id: `ai_similar_${product.id}_${index}`,
        title: suggestion.title || suggestion.name || `Produit similaire ${index + 1}`,
        description: suggestion.description || 'Produit écologique similaire',
        brand: suggestion.brand || 'Marque éco',
        category: product.category,
        eco_score: suggestion.eco_score || 0.6,
        images: [],
        slug: `ai-${(suggestion.title || `produit-${index}`).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        source: 'ai'
      }));
    } catch (error) {
      console.error('❌ Erreur recherche IA:', error);
      return this.getFallbackSuggestions(sourceProduct, limit);
    }
  }

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
      source: 'ai'
    }));
  }
}
