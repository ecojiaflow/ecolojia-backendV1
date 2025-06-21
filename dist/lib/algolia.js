"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSearchParams = void 0;
const algoliasearch_1 = __importDefault(require("algoliasearch"));
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || 'A2KJGZ2811';
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY || '8a6393c1ff95165413e7f0bfea804357';
const ALGOLIA_INDEX_NAME = 'products';
// 🔧 Initialisation du client + index principal
const client = (0, algoliasearch_1.default)(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const algoliaIndex = client.initIndex(ALGOLIA_INDEX_NAME);
// ✅ Export direct de l’index pour usage dans syncAlgolia.ts
exports.default = algoliaIndex;
// 🔧 Paramètres par défaut pour les recherches
exports.defaultSearchParams = {
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
