// TEST OPENFOODFACTS SIMPLIFIÉ - SANS FILTRES COMPLEXES
// Fichier: /tests/test-openfoodfacts.js

const axios = require('axios');
const fs = require('fs');

// ✅ Configuration simplifiée
const CONFIG = {
  BASE_URL: 'https://world.openfoodfacts.org',
  MAX_PRODUCTS: 20
};

// ✅ Test 1: Recherche basique "bio"
async function testBasicSearch() {
  try {
    console.log('🔍 Test 1: Recherche basique "bio"...');
    
    const url = `${CONFIG.BASE_URL}/cgi/search.pl`;
    const params = {
      search_terms: 'bio',
      page_size: 10,
      json: 1,
      fields: 'code,product_name,brands,categories,image_url,countries'
    };

    const response = await axios.get(url, { 
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'Ecolojia-Test/1.0'
      }
    });

    console.log(`✅ Résultats: ${response.data.products?.length || 0} produits`);
    return response.data.products || [];

  } catch (error) {
    console.error('❌ Erreur test basique:', error.message);
    return [];
  }
}

// ✅ Test 2: Produits populaires français
async function testFrenchProducts() {
  try {
    console.log('🔍 Test 2: Produits populaires français...');
    
    const url = `${CONFIG.BASE_URL}/cgi/search.pl`;
    const params = {
      tagtype_0: 'countries',
      tag_contains_0: 'contains',
      tag_0: 'France',
      sort_by: 'popularity_key',
      page_size: 15,
      json: 1,
      fields: 'code,product_name,brands,categories,image_url,labels'
    };

    const response = await axios.get(url, { 
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'Ecolojia-Test/1.0'
      }
    });

    console.log(`✅ Résultats: ${response.data.products?.length || 0} produits français`);
    return response.data.products || [];

  } catch (error) {
    console.error('❌ Erreur test français:', error.message);
    return [];
  }
}

// ✅ Test 3: API différente - Catégories
async function testCategories() {
  try {
    console.log('🔍 Test 3: API Catégories...');
    
    const url = `${CONFIG.BASE_URL}/api/v2/search`;
    const params = {
      categories_tags: 'en:organic-products',
      countries_tags: 'en:france',
      fields: 'code,product_name,brands,image_url',
      page_size: 10
    };

    const response = await axios.get(url, { 
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'Ecolojia-Test/1.0'
      }
    });

    console.log(`✅ Résultats: ${response.data.products?.length || 0} produits catégories`);
    return response.data.products || [];

  } catch (error) {
    console.error('❌ Erreur test catégories:', error.message);
    return [];
  }
}

// ✅ Test 4: Produits au hasard
async function testRandomProducts() {
  try {
    console.log('🔍 Test 4: Produits aléatoires...');
    
    const url = `${CONFIG.BASE_URL}/cgi/search.pl`;
    const params = {
      page_size: 20,
      json: 1,
      fields: 'code,product_name,brands,categories,image_url,countries,labels'
    };

    const response = await axios.get(url, { 
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'Ecolojia-Test/1.0'
      }
    });

    console.log(`✅ Résultats: ${response.data.products?.length || 0} produits aléatoires`);
    return response.data.products || [];

  } catch (error) {
    console.error('❌ Erreur test aléatoire:', error.message);
    return [];
  }
}

// ✅ Transformation simple pour Ecolojia
function transformProducts(products, source) {
  return products
    .filter(p => p.product_name && p.product_name.trim().length > 3)
    .map(product => ({
      id: `off_${product.code}`,
      title: product.product_name.trim(),
      description: generateSimpleDescription(product),
      slug: generateSlug(product.product_name),
      brand: product.brands || null,
      category: 'alimentation',
      tags: extractSimpleTags(product),
      images: product.image_url ? [product.image_url] : [],
      zones_dispo: ['FR'],
      affiliate_url: `https://world.openfoodfacts.org/product/${product.code}`,
      eco_score: 0.6, // Score par défaut pour produits OpenFoodFacts
      ai_confidence: 0.7, // Confiance modérée
      resume_fr: `Produit alimentaire ${product.brands || ''} référencé OpenFoodFacts`,
      resume_en: `Food product ${product.brands || ''} from OpenFoodFacts`,
      source: source,
      external_id: product.code,
      created_at: new Date().toISOString()
    }));
}

// ✅ Fonctions utilitaires simples
function generateSimpleDescription(product) {
  const brand = product.brands ? `de ${product.brands}` : '';
  const categories = product.categories ? ` - ${product.categories.split(',')[0]}` : '';
  return `Produit alimentaire ${brand}${categories}. Données OpenFoodFacts.`;
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40) + `-${Date.now()}`;
}

function extractSimpleTags(product) {
  const tags = ['alimentaire'];
  
  if (product.labels) {
    const labels = product.labels.toLowerCase();
    if (labels.includes('bio') || labels.includes('organic')) tags.push('bio');
    if (labels.includes('vegan')) tags.push('vegan');
    if (labels.includes('gluten')) tags.push('sans-gluten');
  }
  
  if (product.categories) {
    const cats = product.categories.toLowerCase();
    if (cats.includes('boisson')) tags.push('boisson');
    if (cats.includes('snack')) tags.push('collation');
  }
  
  return tags;
}

// ✅ Test principal simplifié
async function runOpenFoodFactsTest() {
  console.log('🚀 TEST OPENFOODFACTS SIMPLIFIÉ');
  console.log('🎯 Objectif: Trouver des produits avec différentes approches\n');
  
  const allProducts = [];
  
  try {
    // Test 1: Recherche basique
    const basic = await testBasicSearch();
    if (basic.length > 0) {
      allProducts.push(...transformProducts(basic.slice(0, 5), 'basic-search'));
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Délai respectueux
    
    // Test 2: Produits français
    const french = await testFrenchProducts();
    if (french.length > 0) {
      allProducts.push(...transformProducts(french.slice(0, 5), 'french-products'));
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Catégories
    const categories = await testCategories();
    if (categories.length > 0) {
      allProducts.push(...transformProducts(categories.slice(0, 5), 'categories-api'));
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Aléatoires si rien d'autre ne marche
    if (allProducts.length === 0) {
      const random = await testRandomProducts();
      if (random.length > 0) {
        allProducts.push(...transformProducts(random.slice(0, 10), 'random-products'));
      }
    }
    
    // Résultats
    console.log('\n📊 RÉSULTATS FINAUX:');
    console.log(`✅ Total produits extraits: ${allProducts.length}`);
    
    if (allProducts.length > 0) {
      // Affichage échantillon
      console.log('\n📋 ÉCHANTILLON:');
      allProducts.slice(0, 3).forEach((product, index) => {
        console.log(`${index + 1}. ${product.title}`);
        console.log(`   Marque: ${product.brand || 'N/A'}`);
        console.log(`   Source: ${product.source}`);
        console.log(`   Tags: ${product.tags.join(', ')}`);
      });
      
      // Sauvegarde
      const filename = `./openfoodfacts-simple-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(allProducts, null, 2));
      console.log(`\n💾 Sauvegardé: ${filename}`);
      
      // Format n8n
      console.log('\n🔄 EXEMPLE POUR N8N:');
      const example = allProducts[0];
      console.log(JSON.stringify({
        title: example.title,
        description: example.description,
        brand: example.brand,
        affiliate_url: example.affiliate_url,
        zones_dispo: example.zones_dispo
      }, null, 2));
      
      console.log('\n✅ SUCCÈS! OpenFoodFacts fonctionne');
      
    } else {
      console.log('\n❌ ÉCHEC: Aucun produit trouvé avec toutes les méthodes');
      console.log('🔄 Recommandation: Tester un autre site (Biocoop)');
    }
    
    return allProducts;
    
  } catch (error) {
    console.error('💥 Erreur globale:', error.message);
    return [];
  }
}

// ✅ Exécution
if (require.main === module) {
  runOpenFoodFactsTest().catch(console.error);
}

module.exports = { runOpenFoodFactsTest };