import type { Product } from "@prisma/client";

async function calculate(product: Product): Promise<{
  eco_score: number;
  ai_confidence: number;
}> {
  console.log("🤖 Appel DeepSeek simulé pour :", product.title);

  return {
    eco_score: Math.random(), // test aléatoire
    ai_confidence: 0.85
  };
}

async function getSimilar(product: Product) {
  console.log("🧠 Suggestions IA simulées pour :", product.title);

  return [
    {
      id: "sim-001",
      title: "Savon solide karité",
      slug: "savon-solide-karite",
      image_url: null,
      eco_score: 0.81
    },
    {
      id: "sim-002",
      title: "Shampoing solide bio",
      slug: "shampoing-solide-bio",
      image_url: null,
      eco_score: 0.74
    }
  ];
}

export default {
  calculate,
  getSimilar
};

