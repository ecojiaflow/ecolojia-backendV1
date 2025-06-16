const { PrismaClient, VerifiedStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.create({
    data: {
      title: "Savon test local",
      description: "Produit de test inséré par script",
      slug: "savon-test-local",
      tags: ["test", "demo"],
      zones_dispo: ["FR"],
      affiliate_url: null,
      eco_score: 0.5,
      ai_confidence: 0.9,
      confidence_pct: 90,
      confidence_color: "yellow",
      verified_status: VerifiedStatus.verified
    }
  });

  console.log("✅ Produit inséré avec succès :", product);
}

main()
  .catch((err) => {
    console.error("❌ Erreur pendant l’insertion :", err);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
