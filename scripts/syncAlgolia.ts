import { prisma } from "../src/lib/prisma";
import algoliaIndex from "../src/lib/algolia"; // ✅ CORRECTION ICI

async function syncAlgolia() {
  console.log("🔄 Début de la synchronisation Algolia...");

  const products = await prisma.product.findMany();
  console.log(`📦 ${products.length} produits trouvés en base\n`);

  // DEBUG sur les 3 premiers produits
  console.log("🔍 DEBUG - Analyse des 3 premiers produits en base:");
  products.slice(0, 3).forEach((p, i) => {
    console.log(`${i + 1}. ${p.title}:`);
    console.log(`   - image_url: "${p.image_url}"`);
    console.log(`   - image_url type: ${typeof p.image_url}`);
    console.log(`   - images: ${JSON.stringify(p.images)}`);
    console.log(`   - images type: ${typeof p.images}`);
    console.log("---");
  });

  const formattedProducts = products.map((p) => {
    const image_url = p.images?.[0] || null;

    return {
      objectID: p.slug,
      title: p.title,
      description: p.description,
      tags: p.tags,
      brand: p.brand,
      category: p.category,
      image_url,
      eco_score: p.eco_score,
    };
  });

  // Stats d’image
  const withImage = formattedProducts.filter((p) => !!p.image_url).length;
  const withoutImage = formattedProducts.length - withImage;
  console.log("\n📊 STATISTIQUES:");
  console.log(`   - Produits avec image: ${withImage}`);
  console.log(`   - Produits sans image: ${withoutImage}\n`);

  console.log("📤 Envoi vers Algolia...");
  await algoliaIndex.saveObjects(formattedProducts);
  console.log(`✅ ${formattedProducts.length} produits réindexés proprement dans Algolia\n`);

  // Vérification post-sync
  console.log("🔍 Vérification post-envoi...");
  formattedProducts.slice(0, 3).forEach((p, i) => {
    console.log(`${i + 1}. ${p.title}:`);
    console.log(`   - objectID: "${p.objectID}"`);
    console.log(`   - image_url: "${p.image_url}"`);
    console.log(`   - image_url type: ${typeof p.image_url}`);
    console.log("---");
  });
}

syncAlgolia()
  .catch((e) => {
    console.error("❌ Erreur lors de la synchronisation Algolia:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
