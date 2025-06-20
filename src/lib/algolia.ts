// ✅ FICHIER COMPLET : src/lib/algolia.ts

import algoliasearch from 'algoliasearch';

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID || 'A2KJGZ2811',
  process.env.ALGOLIA_ADMIN_KEY || '8a6393c1ff95165413e7f0bfea804357'
);

// Index principal des produits
export const productsIndex = client.initIndex('products');

// Types pour les résultats Algolia
export interface AlgoliaProduct {
  objectID: string;
  id: string;
  title: string;
  description: string;
  brand?: string;
  category: string;
  eco_score: number;
  images: string[];
  slug: string;
  tags: string[];
  _highlightResult?: any;
  _snippetResult?: any;
}

// Configuration de recherche par défaut
export const defaultSearchParams = {
  hitsPerPage: 20,
  attributesToRetrieve: [
    'objectID',
    'id', 
    'title',
    'description',
    'brand',
    'category',
    'eco_score',
    'images',
    'slug',
    'tags'
  ],
  attributesToHighlight: ['title', 'brand'],
  attributesToSnippet: ['description:50']
};

export default client;