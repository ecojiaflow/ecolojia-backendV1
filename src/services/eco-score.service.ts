// ✅ FICHIER CORRIGÉ : src/services/eco-score.service.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ProductAnalysis {
  title: string;
  description: string;
  brand?: string;
  category?: string;
  tags: string[];
}

export class EcoScoreService {
  static async calculateEcoScore(productData: ProductAnalysis): Promise<number> {
    try {
      console.log("🌱 Calcul eco_score pour:", productData.title);

      const text = `${productData.title} ${productData.description} ${productData.brand || ''} ${productData.tags.join(" ")}`.toLowerCase();

      let score = 0.5;

      score += EcoScoreService.analyzeMaterials(text);
      score += EcoScoreService.analyzeCertifications(text);
      score += EcoScoreService.analyzeOrigin(text);
      score += EcoScoreService.analyzeDurability(text);
      score -= EcoScoreService.analyzePenalties(text);

      const finalScore = Math.max(0, Math.min(1, score));

      console.log(`✅ Score calculé: ${(finalScore * 100).toFixed(0)}% pour ${productData.title}`);
      return finalScore;
    } catch (error) {
      console.error("❌ Erreur calcul eco_score:", error);
      return 0.5;
    }
  }

  static analyzeMaterials(text: string): number {
    let score = 0;
    const excellent = ["bio", "organic", "bambou", "chanvre", "coton bio", "recyclé", "biodégradable"];
    const good = ["naturel", "bois", "liège", "zéro déchet", "réutilisable"];
    const ok = ["durable", "écologique", "local"];

    excellent.forEach(m => { if (text.includes(m)) score += 0.05; });
    good.forEach(m => { if (text.includes(m)) score += 0.03; });
    ok.forEach(m => { if (text.includes(m)) score += 0.01; });

    return Math.min(score, 0.3);
  }

  static analyzeCertifications(text: string): number {
    let score = 0;
    const certs = ["ecocert", "ab", "cosmebio", "fair trade", "fsc"];
    certs.forEach(cert => { if (text.includes(cert)) score += 0.04; });

    const found = certs.filter(c => text.includes(c));
    if (found.length >= 2) score += 0.02;
    if (found.length >= 3) score += 0.02;

    return Math.min(score, 0.2);
  }

  static analyzeOrigin(text: string): number {
    let score = 0;
    const local = ["made in france", "fabrication française", "local", "européen"];
    const transport = ["transport vert", "carbone neutre"];

    local.forEach(o => { if (text.includes(o)) score += 0.03; });
    transport.forEach(t => { if (text.includes(t)) score += 0.02; });

    return Math.min(score, 0.15);
  }

  static analyzeDurability(text: string): number {
    let score = 0;
    const keywords = ["durable", "résistant", "réparable", "solide"];
    keywords.forEach(k => { if (text.includes(k)) score += 0.015; });
    return Math.min(score, 0.1);
  }

  static analyzePenalties(text: string): number {
    let penalties = 0;
    const badMaterials = ["plastique", "polyester", "nylon", "pvc"];
    const badPractices = ["jetable", "usage unique", "non recyclable"];
    const farOrigin = ["chine", "bangladesh"];

    badMaterials.forEach(m => { if (text.includes(m)) penalties += 0.05; });
    badPractices.forEach(p => { if (text.includes(p)) penalties += 0.03; });
    farOrigin.forEach(o => { if (text.includes(o)) penalties += 0.02; });

    return Math.min(penalties, 0.25);
  }

  static async updateProductEcoScore(productId: string): Promise<number> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          title: true,
          description: true,
          brand: true,
          category: true,
          tags: true
        }
      });

      if (!product) throw new Error(`Produit ${productId} non trouvé`);

      const ecoScore = await EcoScoreService.calculateEcoScore({
        title: product.title || '',
        description: product.description || '',
        brand: product.brand || '',
        category: product.category || '',
        tags: Array.isArray(product.tags) ? product.tags : []
      });

      await prisma.product.update({
        where: { id: productId },
        data: {
          eco_score: ecoScore,
          enriched_at: new Date()
        }
      });

      return ecoScore;
    } catch (error) {
      console.error(`❌ Erreur update eco_score produit ${productId}:`, error);
      throw error;
    }
  }

  static async updateAllEcoScores(): Promise<{ updated: number; errors: number }> {
    try {
      const products = await prisma.product.findMany({
        select: { id: true, title: true, description: true, brand: true, category: true, tags: true }
      });

      let updated = 0;
      let errors = 0;

      for (const product of products) {
        try {
          await EcoScoreService.updateProductEcoScore(product.id);
          updated++;
        } catch (error) {
          console.error("❌ Erreur update produit:", error);
          errors++;
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error("❌ Erreur updateAllEcoScores:", error);
      throw error;
    }
  }
}