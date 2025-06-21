import algoliasearch, { SearchIndex } from 'algoliasearch';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || 'A2KJGZ2811';
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY || '8a6393c1ff95165413e7f0bfea804357';
const ALGOLIA_INDEX_NAME = 'products';

// 🔧 Initialisation du client + index principal
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const algoliaIndex: SearchIndex = client.initIndex(ALGOLIA_INDEX_NAME);

// ✅ Export direct de l’index pour usage dans syncAlgolia.ts
export default algoliaIndex;

// ✅ Interface des objets produits Algolia
export interface AlgoliaProduct {
  objectID: string;
  id?: string;
  title: string;
  description?: string;
  brand?: string;
  category?: string;
  eco_score?: number;
  images?: string[];
  slug: string;
  tags?: string[];
  _highlightResult?: any;
  _snippetResult?: any;
}

// 🔧 Paramètres par défaut pour les recherches
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
