import { PrismaClient } from '@prisma/client';
import algoliasearch from 'algoliasearch';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME ?? 'products';

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error("❌ Algolia APP ID ou ADMIN KEY manquante dans .env");
  process.exit(1);
}

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index = client.initIndex(ALGOLIA_INDEX_NAME);

async function syncProductsToAlgolia() {
  try {
    console.log('🔄 Début de la synchronisation Algolia...');

    const products = await prisma.product.findMany();
    console.log(`📦 ${products.length} produits trouvés en base`);

    // 🔍 DEBUG : Analyser les données avant formatage
    console.log('\n🔍 DEBUG - Analyse des 3 premiers produits en base:');
    products.slice(0, 3).forEach((product, index) => {
      console.log(`${index + 1}. ${product.title}:`);
      console.log(`   - image_url: "${product.image_url}"`);
      console.log(`   - image_url type: ${typeof product.image_url}`);
      console.log(`   - images: ${JSON.stringify(product.images)}`);
      console.log(`   - images type: ${typeof product.images}`);
      console.log('   ---');
    });

    const formatted = products.map((p) => {
      // 🔍 DEBUG : Analyser chaque produit individuellement
      const originalImageUrl = p.image_url;
      const imagesArray = p.images;
      const fallbackImage = imagesArray?.[0];
      
      // 🔧 CORRECTION MAJEURE : Gestion des valeurs null/vides
      let finalImageUrl: string | null = null;
      
      // Vérifier image_url principal
      if (originalImageUrl && 
          originalImageUrl !== null && 
          originalImageUrl !== 'null' && 
          typeof originalImageUrl === 'string' &&
          originalImageUrl.trim() !== '') {
        finalImageUrl = originalImageUrl;
      }
      // Sinon, essayer le fallback
      else if (fallbackImage && 
               typeof fallbackImage === 'string' &&
               fallbackImage.trim() !== '') {
        finalImageUrl = fallbackImage;
      }

      // Log détaillé pour les produits problématiques
      if (p.title.includes('Savon')) {
        console.log(`\n🔍 DEBUG DÉTAILLÉ - ${p.title}:`);
        console.log(`   - p.image_url original: "${originalImageUrl}" (${typeof originalImageUrl})`);
        console.log(`   - p.images: ${JSON.stringify(imagesArray)} (${typeof imagesArray})`);
        console.log(`   - p.images?.[0]: "${fallbackImage}" (${typeof fallbackImage})`);
        console.log(`   - Résultat final: "${finalImageUrl}" (${typeof finalImageUrl})`);
      }

      return {
        objectID: p.slug,
        title: p.title,
        slug: p.slug,
        description: p.description,
        image_url: finalImageUrl, // ✅ null ou string valide
        eco_score: p.eco_score,
        ai_confidence: p.ai_confidence,
        confidence_color: p.confidence_color,
        zones_dispo: p.zones_dispo,
        tags: p.tags,
        affiliate_url: p.affiliate_url ?? undefined
      };
    });

    // 🔍 DEBUG : Vérifier les objets formatés avant envoi
    console.log('\n🔍 DEBUG - Objets formatés pour Algolia (3 premiers):');
    formatted.slice(0, 3).forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.title}:`);
      console.log(`   - objectID: "${obj.objectID}"`);
      console.log(`   - image_url: "${obj.image_url}"`);
      console.log(`   - image_url type: ${typeof obj.image_url}`);
      console.log('   ---');
    });

    // 🔍 DEBUG : Compter les produits avec/sans images
    const withImages = formatted.filter(p => p.image_url && p.image_url !== null).length;
    const withoutImages = formatted.length - withImages;
    console.log(`\n📊 STATISTIQUES:`);
    console.log(`   - Produits avec image: ${withImages}`);
    console.log(`   - Produits sans image: ${withoutImages}`);

    // Envoi à Algolia
    console.log('\n📤 Envoi vers Algolia...');
    await index.replaceAllObjects(formatted, {
      autoGenerateObjectIDIfNotExist: false
    });

    console.log(`✅ ${formatted.length} produits réindexés proprement dans Algolia`);

    // 🔍 DEBUG : Vérifier ce qui a été envoyé à Algolia
    console.log('\n🔍 Vérification post-envoi...');
    const algoliaData = await index.search('', { 
      hitsPerPage: 3,
      attributesToRetrieve: ['objectID', 'title', 'image_url']
    });
    
    console.log('📥 Échantillon de ce qui est maintenant dans Algolia:');
    algoliaData.hits.forEach((hit: any, index: number) => {
      console.log(`${index + 1}. ${hit.title}:`);
      console.log(`   - objectID: "${hit.objectID}"`);
      console.log(`   - image_url: "${hit.image_url}"`);
      console.log(`   - image_url type: ${typeof hit.image_url}`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    throw error;
  }
}

// 🔧 Fonction pour diagnostiquer un produit spécifique
async function debugSpecificProduct(slug: string) {
  try {
    console.log(`\n🔍 DEBUG PRODUIT SPÉCIFIQUE: ${slug}`);
    
    const product = await prisma.product.findUnique({
      where: { slug }
    });

    if (!product) {
      console.log('❌ Produit non trouvé en base');
      return;
    }

    console.log('📊 Données en base PostgreSQL:');
    console.log(`   - title: "${product.title}"`);
    console.log(`   - slug: "${product.slug}"`);
    console.log(`   - image_url: "${product.image_url}"`);
    console.log(`   - image_url type: ${typeof product.image_url}`);
    console.log(`   - images: ${JSON.stringify(product.images)}`);
    console.log(`   - images type: ${typeof product.images}`);

    // Vérifier dans Algolia
    const algoliaHit = await index.getObject(slug).catch(() => null) as any;
    
    if (algoliaHit) {
      console.log('\n📊 Données dans Algolia:');
      console.log(`   - title: "${algoliaHit.title}"`);
      console.log(`   - image_url: "${algoliaHit.image_url}"`);
      console.log(`   - image_url type: ${typeof algoliaHit.image_url}`);
    } else {
      console.log('\n❌ Produit non trouvé dans Algolia');
    }

  } catch (error) {
    console.error('❌ Erreur debug:', error);
  }
}

// Exécution
syncProductsToAlgolia()
  .then(async () => {
    // Debug automatique des produits Savon après sync
    console.log('\n🔍 DEBUG POST-SYNC des produits Savon...');
    await debugSpecificProduct('savon-alep-artisanal');
    await debugSpecificProduct('savon-test-local');
  })
  .catch((err) => {
    console.error("❌ Erreur de synchronisation :", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });