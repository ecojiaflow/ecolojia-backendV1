// IMPORT OPENFOODFACTS VERS N8N WORKFLOW
// Fichier: /scripts/import-openfoodfacts.js

const axios = require('axios');
const fs = require('fs');

// ✅ Configuration
const CONFIG = {
  N8N_WEBHOOK_URL: 'https://ecolojia.app.n8n.cloud/webhook/product-webhook', // URL FINALE CORRECTE
  OPENFOODFACTS_URL: 'https://world.openfoodfacts.org/cgi/search.pl',
  BATCH_SIZE: 10, // Traiter par lots de 10
  DELAY_MS: 3000, // 3s entre chaque produit (respecter n8n/DeepSeek)
  MAX_PRODUCTS: 50 // Limite pour test
};

// ✅ Récupération produits OpenFoodFacts
async function fetchOpenFoodFactsProducts() {
  try {
    console.log('🔍 Récupération produits OpenFoodFacts...');
    
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
        'User-Agent': 'Ecolojia-Import/1.0'
      }
    });

    const products = response.data.products || [];
    console.log(`✅ ${products.length} produits récupérés`);
    
    return products.filter(p => 
      p.product_name && 
      p.product_name.trim().length > 5 &&
      !p.product_name.toLowerCase().includes('test')
    );

  } catch (error) {
    console.error('❌ Erreur récupération:', error.message);
    return [];
  }
}

// ✅ Transformation pour webhook n8n
function transformForN8n(product) {
  const description = generateDescription(product);
  const zones = ['FR']; // Produits français
  
  return {
    title: product.product_name.trim(),
    description: description,
    brand: product.brands || null,
    category: 'alimentation-bio',
    zones_dispo: zones,
    affiliate_url: `https://world.openfoodfacts.org/product/${product.code}`,
    source: 'OpenFoodFacts',
    external_id: product.code,
    images: product.image_url ? [product.image_url] : []
  };
}

// ✅ Génération description intelligente
function generateDescription(product) {
  let desc = '';
  
  if (product.brands) {
    desc += `Produit ${product.brands}. `;
  }
  
  if (product.categories) {
    const mainCategory = product.categories.split(',')[0].trim();
    desc += `Catégorie: ${mainCategory}. `;
  }
  
  if (product.ingredients_text) {
    const ingredients = product.ingredients_text.substring(0, 100);
    desc += `Ingrédients: ${ingredients}...`;
  } else {
    desc += 'Produit alimentaire bio référencé OpenFoodFacts.';
  }
  
  return desc.trim();
}

// ✅ Envoi vers webhook n8n
async function sendToN8nWebhook(productData) {
  try {
    const response = await axios.post(CONFIG.N8N_WEBHOOK_URL, productData, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Envoyé: ${productData.title.substring(0, 40)}...`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ Erreur envoi "${productData.title.substring(0, 30)}...":`, error.message);
    return null;
  }
}

// ✅ Import par lots avec délai
async function importProductsBatch(products) {
  console.log(`\n🚀 Import ${products.length} produits vers n8n...`);
  console.log(`⏱️  Délai: ${CONFIG.DELAY_MS}ms entre produits`);
  
  const results = {
    success: 0,
    errors: 0,
    total: products.length
  };
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`\n📦 ${i + 1}/${products.length}: ${product.product_name}`);
    
    try {
      // Transformation
      const n8nData = transformForN8n(product);
      
      // Envoi webhook
      const result = await sendToN8nWebhook(n8nData);
      
      if (result) {
        results.success++;
        console.log(`   ✅ Succès`);
      } else {
        results.errors++;
        console.log(`   ❌ Échec`);
      }
      
    } catch (error) {
      results.errors++;
      console.error(`   💥 Erreur: ${error.message}`);
    }
    
    // Délai respectueux pour n8n et DeepSeek
    if (i < products.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_MS));
    }
  }
  
  return results;
}

// ✅ Fonction principale
async function runImport() {
  console.log('🚀 IMPORT OPENFOODFACTS → N8N');
  console.log(`🎯 Objectif: ${CONFIG.MAX_PRODUCTS} produits max\n`);
  
  try {
    // 1. Récupération produits
    const products = await fetchOpenFoodFactsProducts();
    
    if (products.length === 0) {
      console.log('❌ Aucun produit à importer');
      return;
    }
    
    // 2. Import par lots
    const results = await importProductsBatch(products);
    
    // 3. Statistiques finales
    console.log('\n📊 RÉSULTATS IMPORT:');
    console.log(`✅ Succès: ${results.success}/${results.total}`);
    console.log(`❌ Erreurs: ${results.errors}/${results.total}`);
    console.log(`📈 Taux succès: ${Math.round((results.success / results.total) * 100)}%`);
    
    // 4. Sauvegarde log
    const logData = {
      timestamp: new Date().toISOString(),
      results: results,
      config: CONFIG
    };
    
    fs.writeFileSync(
      `./import-log-${Date.now()}.json`, 
      JSON.stringify(logData, null, 2)
    );
    
    console.log('\n💾 Log sauvegardé');
    console.log('🔄 Vérification dans PostgreSQL + Algolia recommandée');
    
  } catch (error) {
    console.error('💥 Erreur import:', error.message);
  }
}

// ✅ Test webhook (avant import massif)
async function testWebhook() {
  console.log('🧪 TEST WEBHOOK N8N\n');
  
  const testProduct = {
    title: 'Test Produit Bio OpenFoodFacts',
    description: 'Produit test pour validation workflow n8n.',
    brand: 'TestBrand',
    category: 'test',
    zones_dispo: ['FR'],
    affiliate_url: 'https://world.openfoodfacts.org/product/test',
    source: 'Test'
  };
  
  try {
    const result = await sendToN8nWebhook(testProduct);
    
    if (result) {
      console.log('✅ Webhook fonctionne!');
      console.log('🚀 Lancement import recommandé');
      return true;
    } else {
      console.log('❌ Webhook ne répond pas');
      console.log('🔧 Vérifier URL webhook n8n');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test webhook échoué:', error.message);
    return false;
  }
}

// ✅ Menu interactif
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    await testWebhook();
  } else if (args.includes('--import')) {
    await runImport();
  } else {
    console.log('🔧 SCRIPT IMPORT OPENFOODFACTS');
    console.log('\nCommandes disponibles:');
    console.log('  node scripts/import-openfoodfacts.js --test     # Test webhook');
    console.log('  node scripts/import-openfoodfacts.js --import   # Import complet');
    console.log('\n⚠️  IMPORTANT: Configurer N8N_WEBHOOK_URL d\'abord!');
  }
}

// ✅ Exécution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runImport, testWebhook, fetchOpenFoodFactsProducts };