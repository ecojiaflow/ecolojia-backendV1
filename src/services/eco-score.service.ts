// Service de calcul du score écologique par IA
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductAnalysis {
  title: string;
  description: string;
  brand?: string;
  category?: string;
  tags: string[];
}

export class EcoScoreService {
  
  /**
   * Calcule le score écologique d'un produit (0-1)
   * Analyse: matériaux, certifications, origine, durabilité
   */
  static async calculateEcoScore(productData: ProductAnalysis): Promise<number> {
    try {
      console.log('🌱 Calcul eco_score pour:', productData.title);
      
      const text = `${productData.title} ${productData.description} ${productData.brand || ''} ${productData.tags.join(' ')}`.toLowerCase();
      
      let score = 0.5; // Score de base neutre
      
      // 1. Analyse des matériaux écologiques (+0.3 max)
      score += this.analyzeMaterials(text);
      
      // 2. Analyse des certifications (+0.2 max)
      score += this.analyzeCertifications(text);
      
      // 3. Analyse de l'origine/fabrication (+0.15 max)
      score += this.analyzeOrigin(text);
      
      // 4. Analyse de la durabilité (+0.1 max)
      score += this.analyzeDurability(text);
      
      // 5. Pénalités pour éléments négatifs (-0.25 max)
      score -= this.analyzePenalties(text);
      
      // Maintenir entre 0 et 1
      const finalScore = Math.max(0, Math.min(1, score));
      
      console.log(`✅ Score calculé: ${(finalScore * 100).toFixed(0)}% pour ${productData.title}`);
      return finalScore;
      
    } catch (error) {
      console.error('❌ Erreur calcul eco_score:', error);
      return 0.5; // Score neutre par défaut
    }
  }

  /**
   * Analyse des matériaux (0 à +0.3)
   */
  private static analyzeMaterials(text: string): number {
    let score = 0;
    
    // Matériaux très écologiques (+0.05 chacun)
    const excellentMaterials = [
      'bio', 'biologique', 'organic', 'bambou', 'chanvre', 'lin',
      'coton bio', 'recyclé', 'upcyclé', 'compostable', 'biodégradable'
    ];
    
    // Matériaux écologiques moyens (+0.03 chacun)
    const goodMaterials = [
      'naturel', 'végétal', 'bois', 'liège', 'fibres naturelles',
      'sans plastique', 'zéro déchet', 'réutilisable'
    ];
    
    // Matériaux corrects (+0.01 chacun)
    const okMaterials = [
      'durable', 'écologique', 'responsable', 'éthique',
      'local', 'artisanal', 'fait main'
    ];

    excellentMaterials.forEach(material => {
      if (text.includes(material)) score += 0.05;
    });

    goodMaterials.forEach(material => {
      if (text.includes(material)) score += 0.03;
    });

    okMaterials.forEach(material => {
      if (text.includes(material)) score += 0.01;
    });

    return Math.min(0.3, score);
  }

  /**
   * Analyse des certifications (0 à +0.2)
   */
  private static analyzeCertifications(text: string): number {
    let score = 0;
    
    const certifications = [
      'ecocert', 'ab', 'cosmebio', 'natrue', 'bdih',
      'usda organic', 'demeter', 'fair trade', 'commerce équitable',
      'cradle to cradle', 'fsc', 'pefc', 'eu ecolabel',
      'soil association', 'cosmos', 'icea'
    ];

    certifications.forEach(cert => {
      if (text.includes(cert)) score += 0.04;
    });

    // Bonus pour plusieurs certifications
    const foundCerts = certifications.filter(cert => text.includes(cert));
    if (foundCerts.length >= 2) score += 0.02;
    if (foundCerts.length >= 3) score += 0.02;

    return Math.min(0.2, score);
  }

  /**
   * Analyse de l'origine (0 à +0.15)
   */
  private static analyzeOrigin(text: string): number {
    let score = 0;
    
    // Origine très locale (+0.05)
    const veryLocal = [
      'france', 'français', 'made in france', 'fabrication française',
      'artisan français', 'produit français'
    ];
    
    // Origine locale/européenne (+0.03)
    const local = [
      'europe', 'européen', 'local', 'région', 'artisanal',
      'circuit court', 'proximité'
    ];
    
    // Transport écologique (+0.02)
    const ecoTransport = [
      'transport vert', 'livraison écologique', 'carbone neutre',
      'compensé carbone'
    ];

    veryLocal.forEach(origin => {
      if (text.includes(origin)) score += 0.05;
    });

    local.forEach(origin => {
      if (text.includes(origin)) score += 0.03;
    });

    ecoTransport.forEach(transport => {
      if (text.includes(transport)) score += 0.02;
    });

    return Math.min(0.15, score);
  }

  /**
   * Analyse de la durabilité (0 à +0.1)
   */
  private static analyzeDurability(text: string): number {
    let score = 0;
    
    const durabilityKeywords = [
      'durable', 'longue durée', 'résistant', 'qualité',
      'garantie', 'réparable', 'modulaire', 'intemporel',
      'robuste', 'solide', 'longue vie'
    ];

    durabilityKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 0.015;
    });

    return Math.min(0.1, score);
  }

  /**
   * Pénalités pour éléments négatifs (0 à -0.25)
   */
  private static analyzePenalties(text: string): number {
    let penalties = 0;
    
    // Matériaux polluants (-0.05 chacun)
    const badMaterials = [
      'plastique', 'polyester', 'acrylique', 'nylon',
      'pvc', 'polystyrène', 'pétrochimique'
    ];
    
    // Pratiques non écologiques (-0.03 chacun)
    const badPractices = [
      'jetable', 'usage unique', 'suremballé',
      'non recyclable', 'toxique', 'chimique'
    ];
    
    // Origine lointaine (-0.02 chacun)
    const distantOrigins = [
      'chine', 'bangladesh', 'vietnam', 'importé',
      'transport longue distance'
    ];

    badMaterials.forEach(material => {
      if (text.includes(material)) penalties += 0.05;
    });

    badPractices.forEach(practice => {
      if (text.includes(practice)) penalties += 0.03;
    });

    distantOrigins.forEach(origin => {
      if (text.includes(origin)) penalties += 0.02;
    });

    return Math.min(0.25, penalties);
  }

  /**
   * Met à jour le score d'un produit spécifique
   */
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

      if (!product) {
        throw new Error(`Produit ${productId} non trouvé`);
      }

      const ecoScore = await this.calculateEcoScore({
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

      console.log(`✅ Score mis à jour: ${product.title} = ${(ecoScore * 100).toFixed(0)}%`);
      return ecoScore;
      
    } catch (error) {
      console.error(`❌ Erreur mise à jour produit ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Met à jour tous les scores écologiques
   */
  static async updateAllEcoScores(): Promise<{ updated: number; errors: number }> {
    try {
      const products = await prisma.product.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          brand: true,
          category: true,
          tags: true
        }
      });

      console.log(`🔄 Mise à jour des eco_scores pour ${products.length} produits...`);

      let updated = 0;
      let errors = 0;

      for (const product of products) {
        try {
          await this.updateProductEcoScore(product.id);
          updated++;
        } catch (error) {
          console.error(`❌ Erreur produit ${product.id}:`, error);
          errors++;
        }
      }

      console.log(`🎉 Mise à jour terminée: ${updated} succès, ${errors} erreurs`);
      return { updated, errors };
      
    } catch (error) {
      console.error('❌ Erreur mise à jour globale:', error);
      throw error;
    }
  }
}