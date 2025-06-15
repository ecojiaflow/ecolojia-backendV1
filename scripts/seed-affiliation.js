const { PrismaClient, ConfidenceColor, VerifiedStatus, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const product = await prisma.product.create({
    data: {
      title: "Savon d’Alep artisanal",
      description: "Savon traditionnel syrien à base d’huile d’olive et de laurier",
      slug: "savon-alep-tracking",
      brand: "Mombu",
      category: "hygiène",
      tags: ["zero-waste", "vegan"],
      images: ["https://via.placeholder.com/300"],
      zones_dispo: ["FR", "BE"],
      prices: {
        FR: { amount: 6.9, currency: "EUR" },
        BE: { amount: 7.5, currency: "EUR" }
      },
      affiliate_url: null,
      eco_score: new Prisma.Decimal(4.5),
      ai_confidence: new Prisma.Decimal(0.91),
      confidence_pct: 91,
      confidence_color: ConfidenceColor.green,
      verified_status: VerifiedStatus.verified,
      resume_fr: "Savon bio traditionnel",
      resume_en: "Traditional natural soap",
      created_at: now,
      updated_at: now,
      enriched_at: now
    }
  });

  const partner = await prisma.partner.create({
    data: {
      name: "EcoMarket",
      website: "https://ecomarket.fr"
    }
  });

  const link = await prisma.partnerLink.create({
    data: {
      url: "https://ecomarket.fr/savon-alep",
      productId: product.id,
      partnerId: partner.id
    }
  });

  console.log("✅ Produit compatible injecté !");
  console.log("Slug :", product.slug);
  console.log("Lien de tracking :", `http://localhost:3000/api/track/${link.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed :", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
