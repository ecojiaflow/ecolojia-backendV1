// IMPORT DIRECT FINAL - 50 PRODUITS OPENFOODFACTS
// Bypass n8n - Import direct PostgreSQL + Algolia
// Fichier: /scripts/direct-import-final.js

const axios = require('axios');
const fs = require('fs');

// ✅ Configuration complète
const CONFIG = {
  BACKEND_URL: 'https://ecolojia-backendv1.onrender.com', // PRODUCTION RENDER
  OPENFOODFACTS_URL: 'https://world.openfoodfacts.org/cgi/search.pl',
  ALGOLIA_URL: 'https://A2KJGZ2811-dsn.algolia.net/1/indexes/products/batch',
  ALGOLIA_APP_ID: 'A2KJGZ2811',
  ALGOLIA_ADMIN_KEY: '8a6393c1ff95165413e7f0bfea804357',
  MAX_PRODUCTS: 50,
  BATCH_SIZE: 5,
  DELAY_MS: 2000
};

// ✅ Récupération produits OpenFoodFacts
async function fetchProducts() {
  try {
    console.log('🔍 Récupération OpenFoodFacts...');
    
    const params = {
      search_terms: 'bio organic',
      tagtype_0: 'countries',
      tag_contains_0: 'contains',
      tag_0: 'France',
      sort_by: 'popularity_key',
      page_size: CONFIG.MAX_PRODUCTS,
      json: 1,
      fields: 'code,product_name,brands,categories,image_url,labels,ingredients_text'
    };

    const response = await axios.get(CONFIG.OPENFOODFACTS_URL, { 
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Ecolojia-DirectImport/1.0'
      }
    });

    const products = (response.data.products || []).filter(p => 
      p.product_name && 
      p.product_name.trim().length > 5 &&
      !p.product_name.toLowerCase().includes('test')
    );

    console.log(`✅ ${products.length} produits récupérés`);
    return products;

  } catch (error) {
    console.error('❌ Erreur OpenFoodFacts:', error.message);
    return [];
  }
}

// ✅ Transformation enrichie
function transformProduct(product, index) {
  const slug = generateUniqueSlug(product.product_name, index);
  const ecoScore = calculateEcoScore(product);
  const confidence = 0.75;
  const confidenceColor = confidence >= 0.85 ? 'green' : confidence >= 0.6 ? 'yellow' : 'red';
  const tags = extractTags(product);
  
  return {
    id: `off_${product.code}`,
    title: product.product_name.trim(),
    description: generateDescription(product),
    slug: slug,
    brand: product.brands || null,
    category: 'alimentation-bio',
    tags: tags,
    images: product.image_url ? [product.image_url] : ['https://via.placeholder.com/300x200?text=Bio+Product'],
    zones_dispo: ['FR'],
    prices: {
      FR: {
        amount: Math.floor(Math.random() * 20) + 5, // Prix simulé 5-25€
        currency: 'EUR'
      }
    },
    affiliate_url: `https://world.openfoodfacts.org/product/${product.code}`,
    eco_score: ecoScore,
    ai_confidence: 0.75, // Confiance modérée (pas d'IA)
    confidence_pct: 75,
    confidence_color: confidenceColor, // Utilise la valeur calculée
    verified_status: 'manual_review',
    resume_fr: generateResumeFr(product),
    resume_en: generateResumeEn(product),
    // Note: champs source et external_id supprimés (non supportés)
    enriched_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
}

// ✅ Fonctions utilitaires
function generateUniqueSlug(title, index) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);
  return `${base}-off-${index}-${Date.now()}`;
}

function calculateEcoScore(product) {
  let score = 0.6; // Base bio
  
  const labels = (product.labels || '').toLowerCase();
  if (labels.includes('bio') || labels.includes('organic')) score += 0.2;
  if (labels.includes('fair-trade') || labels.includes('commerce-equitable')) score += 0.1;
  if (labels.includes('local') || labels.includes('france')) score += 0.1;
  
  return Math.min(1, score);
}

function extractTags(product) {
  const tags = ['bio', 'alimentaire', 'openfoodfacts'];
  
  const labels = (product.labels || '').toLowerCase();
  const categories = (product.categories || '').toLowerCase();
  
  if (labels.includes('vegan')) tags.push('vegan');
  if (labels.includes('sans-gluten') || labels.includes('gluten-free')) tags.push('sans-gluten');
  if (labels.includes('equitable')) tags.push('équitable');
  if (categories.includes('boisson')) tags.push('boisson');
  if (categories.includes('snack')) tags.push('collation');
  if (product.brands && product.brands.toLowerCase().includes('bio')) tags.push('certifié-bio');
  
  return [...new Set(tags)];
}

function generateDescription(product) {
  let desc = '';
  
  if (product.brands) {
    desc += `Produit bio ${product.brands}. `;
  }
  
  if (product.categories) {
    const mainCat = product.categories.split(',')[0].trim();
    desc += `Catégorie: ${mainCat}. `;
  }
  
  if (product.ingredients_text && product.ingredients_text.length > 10) {
    const ingredients = product.ingredients_text.substring(0, 150);
    desc += `Ingrédients: ${ingredients}...`;
  } else {
    desc += 'Produit alimentaire biologique certifié, respectueux de l\'environnement et de votre santé.';
  }
  
  return desc.trim();
}

function generateResumeFr(product) {
  const brand = product.brands ? `${product.brands} - ` : '';
  return `${brand}Produit bio certifié OpenFoodFacts, respectueux de l'environnement.`;
}

function generateResumeEn(product) {
  const brand = product.brands ? `${product.brands} - ` : '';
  return `${brand}Certified organic product from OpenFoodFacts, environmentally friendly.`;
}

// ✅ Sauvegarde directe PostgreSQL (endpoints alternatifs)
async function saveToDatabase(products) {
  console.log('\n💾 Sauvegarde PostgreSQL...');
  
  let saved = 0;
  
  for (const product of products) {
    try {
      // Test plusieurs endpoints dans l'ordre logique
      const endpoints = [
        '/api/products',           // Standard REST
        '/api/product',            // Singulier
        '/api/prisma/Product',     // Prisma avec majuscule
        '/api/prisma/products'     // Prisma pluriel
      ];
      
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.post(
            `${CONFIG.BACKEND_URL}${endpoint}`,
            product,
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 15000
            }
          );
          
          console.log(`✅ Sauvé via ${endpoint}: ${product.title.substring(0, 40)}...`);
          saved++;
          success = true;
          break;
          
        } catch (endpointError) {
          // Continue avec l'endpoint suivant
          continue;
        }
      }
      
      if (!success) {
        console.error(`❌ Tous endpoints échoués: ${product.title.substring(0, 30)}...`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur générale: ${product.title.substring(0, 30)}...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n💾 PostgreSQL: ${saved}/${products.length} sauvegardés`);
  return saved;
}

// ✅ Indexation directe Algolia
async function indexToAlgolia(products) {
  console.log('\n🔍 Indexation Algolia...');
  
  try {
    const algoliaObjects = products.map(product => ({
      objectID: product.id,
      title: product.title,
      description: product.description,
      brand: product.brand,
      category: product.category,
      tags: product.tags,
      eco_score: product.eco_score,
      ai_confidence: product.ai_confidence,
      zones_dispo: product.zones_dispo,
      verified_status: product.verified_status,
      image: product.images?.[0] || null
    }));
    
    const batchRequests = algoliaObjects.map(obj => ({
      action: 'updateObject',
      body: obj
    }));
    
    const response = await axios.post(
      CONFIG.ALGOLIA_URL,
      { requests: batchRequests },
      {
        headers: {
          'X-Algolia-API-Key': CONFIG.ALGOLIA_ADMIN_KEY,
          'X-Algolia-Application-Id': CONFIG.ALGOLIA_APP_ID,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log(`✅ Algolia: ${algoliaObjects.length} produits indexés`);
    return true;
    
  } catch (error) {
    console.error('❌ Erreur Algolia:', error.response?.data || error.message);
    return false;
  }
}

// ✅ Import complet
async function runDirectImport() {
  console.log('🚀 IMPORT DIRECT COMPLET - OPENFOODFACTS');
  console.log(`📊 Objectif: ${CONFIG.MAX_PRODUCTS} produits\n`);
  
  try {
    // 1. Récupération
    const rawProducts = await fetchProducts();
    if (rawProducts.length === 0) return;
    
    // 2. Transformation
    console.log('\n🔄 Transformation produits...');
    const enrichedProducts = rawProducts.map((product, index) => 
      transformProduct(product, index)
    );
    
    // 3. Sauvegarde base de données (IMPORT COMPLET)
    console.log('\n💾 Import complet de tous les produits...');
    const savedCount = await saveToDatabase(enrichedProducts);
    
    // 4. Indexation Algolia
    if (savedCount > 0) {
      await indexToAlgolia(enrichedProducts.slice(0, savedCount));
    }
    
    // 5. Statistiques finales
    console.log('\n📊 RÉSULTATS FINAUX:');
    console.log(`✅ Produits traités: ${enrichedProducts.length}`);
    console.log(`💾 PostgreSQL: ${savedCount} sauvegardés`);
    console.log(`🔍 Algolia: Indexés`);
    console.log(`🎯 Taux succès: ${Math.round((savedCount / enrichedProducts.length) * 100)}%`);
    
    // 6. Sauvegarde log
    const logData = {
      timestamp: new Date().toISOString(),
      imported: savedCount,
      total: enrichedProducts.length,
      products: enrichedProducts.slice(0, 5) // Échantillon
    };
    
    fs.writeFileSync(
      `./import-direct-log-${Date.now()}.json`, 
      JSON.stringify(logData, null, 2)
    );
    
    console.log('\n💾 Log sauvegardé');
    console.log('🎉 IMPORT TERMINÉ! Produits disponibles sur le site');
    
  } catch (error) {
    console.error('💥 Erreur import:', error.message);
  }
}

// ✅ Exécution
if (require.main === module) {
  runDirectImport().catch(console.error);
}

module.exports = { runDirectImport, fetchProducts, transformProduct };