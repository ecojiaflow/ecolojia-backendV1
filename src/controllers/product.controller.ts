import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/* --------------------------------------------------------------------------
 * GET /api/products  → liste d'accueil
 * ------------------------------------------------------------------------*/
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { created_at: "desc" },
      include: { partnerLinks: { include: { partner: true } } },
    });
    res.json(products);
  } catch (error) {
    console.error("❌ getAllProducts :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* --------------------------------------------------------------------------
 * GET /api/products/:slug  → recherche flexible multi-format
 * ------------------------------------------------------------------------*/
export const getProductBySlug = async (req: Request, res: Response) => {
  const raw = req.params.slug?.trim();
  
  if (!raw) return res.status(400).json({ error: "Slug manquant" });
  
  console.log("🔍 Recherche pour:", JSON.stringify(raw));
  
  try {
    // Test 1: slug exact
    let product = await prisma.product.findFirst({
      where: { slug: raw },
      include: { partnerLinks: { include: { partner: true } } },
    });
    
    if (product) {
      console.log("✅ Trouvé par slug exact");
      return res.json(product);
    }
    
    // Test 2: recherche par suffixe numérique (10+ chiffres consécutifs)
    const numericSuffix = raw.match(/(\d{10,})/)?.[1];
    
    if (numericSuffix) {
      console.log("🔍 Recherche par suffixe numérique:", numericSuffix);
      
      product = await prisma.product.findFirst({
        where: { 
          slug: { 
            contains: numericSuffix,
            mode: "insensitive" 
          } 
        },
        include: { partnerLinks: { include: { partner: true } } },
      });
      
      if (product) {
        console.log("✅ Trouvé par suffixe numérique:", product.slug);
        return res.json(product);
      }
    }
    
    // Test 3: recherche spéciale pour format off_XXXXXX
    if (raw.startsWith('off_')) {
      const offCode = raw.substring(4); // Enlève "off_"
      console.log("🔍 Recherche format off_ avec code:", offCode);
      
      product = await prisma.product.findFirst({
        where: { 
          OR: [
            { slug: { contains: offCode, mode: "insensitive" } },
            { id: { contains: raw, mode: "insensitive" } },
            { slug: { contains: raw, mode: "insensitive" } }
          ]
        },
        include: { partnerLinks: { include: { partner: true } } },
      });
      
      if (product) {
        console.log("✅ Trouvé par code off_:", product.slug);
        return res.json(product);
      }
    }
    
    // Test 4: recherche par ID exact (cas où le slug est en fait un ID)
    console.log("🔍 Recherche par ID exact");
    product = await prisma.product.findFirst({
      where: { id: raw },
      include: { partnerLinks: { include: { partner: true } } },
    });
    
    if (product) {
      console.log("✅ Trouvé par ID exact:", product.id);
      return res.json(product);
    }
    
    // Test 5: recherche endsWith avec préfixe -
    const slug = raw.startsWith("-") ? raw : `-${raw}`;
    console.log("🔍 Recherche endsWith:", slug);
    
    product = await prisma.product.findFirst({
      where: { slug: { endsWith: slug, mode: "insensitive" } },
      include: { partnerLinks: { include: { partner: true } } },
    });
    
    if (product) {
      console.log("✅ Trouvé par endsWith");
      return res.json(product);
    }
    
    // Test 6: recherche contains général
    console.log("🔍 Recherche contains général");
    product = await prisma.product.findFirst({
      where: { 
        OR: [
          { slug: { contains: raw, mode: "insensitive" } },
          { id: { contains: raw, mode: "insensitive" } },
          { title: { contains: raw, mode: "insensitive" } }
        ]
      },
      include: { partnerLinks: { include: { partner: true } } },
    });
    
    if (product) {
      console.log("✅ Trouvé par contains général");
      return res.json(product);
    }
    
    // Test 7: recherche par code barres (pour les off_XXXXX)
    if (raw.includes('off') || raw.includes('_')) {
      console.log("🔍 Recherche par pattern off/code barres");
      const cleanCode = raw.replace(/off_?/gi, '').replace(/_/g, '');
      
      if (cleanCode.length > 6) {
        product = await prisma.product.findFirst({
          where: { 
            OR: [
              { slug: { contains: cleanCode, mode: "insensitive" } },
              { id: { contains: cleanCode, mode: "insensitive" } }
            ]
          },
          include: { partnerLinks: { include: { partner: true } } },
        });
        
        if (product) {
          console.log("✅ Trouvé par code barres nettoyé:", product.slug);
          return res.json(product);
        }
      }
    }
    
    console.log("❌ Aucun produit trouvé pour:", raw);
    return res.status(404).json({ error: "Produit non trouvé" });
    
  } catch (error) {
    console.error("❌ getProductBySlug :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* --------------------------------------------------------------------------
 * POST /api/products  → création
 * ------------------------------------------------------------------------*/
export const createProduct = async (req: Request, res: Response) => {
  try {
    const data = req.body ?? {};
    if (typeof data !== "object") return res.status(400).json({ error: "Corps invalide" });

    const slug =
      data.slug || `${(data.title || "produit").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    const product = await prisma.product.create({
      data: {
        id: data.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        title: data.title ?? "Produit sans titre",
        description: data.description ?? "",
        slug,
        brand: data.brand ?? null,
        category: data.category ?? "générique",
        tags: Array.isArray(data.tags) ? data.tags : [],
        images: Array.isArray(data.images) ? data.images : [],
        zones_dispo: Array.isArray(data.zones_dispo) ? data.zones_dispo : ["FR"],
        prices: data.prices ?? {},
        affiliate_url: data.affiliate_url ?? null,
        eco_score: data.eco_score ?? 0.5,
        ai_confidence: data.ai_confidence ?? 0.5,
        confidence_pct: data.confidence_pct ?? 50,
        confidence_color: data.confidence_color ?? "orange",
        verified_status: data.verified_status ?? "manual_review",
        resume_fr: data.resume_fr ?? null,
        resume_en: data.resume_en ?? null,
        enriched_at: new Date(),
        created_at: new Date(),
      },
      include: { partnerLinks: { include: { partner: true } } },
    });
    res.status(201).json(product);
  } catch (error: any) {
    if (error.code === "P2002") return res.status(409).json({ error: "Produit existe déjà" });
    console.error("❌ createProduct :", error);
    res.status(500).json({ error: "Erreur création" });
  }
};

/* --------------------------------------------------------------------------
 * PUT /api/products/:id  → mise à jour
 * ------------------------------------------------------------------------*/
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
      include: { partnerLinks: { include: { partner: true } } },
    });
    res.json(product);
  } catch (error: any) {
    if (error.code === "P2025") return res.status(404).json({ error: "Produit non trouvé" });
    console.error("❌ updateProduct :", error);
    res.status(500).json({ error: "Erreur mise à jour" });
  }
};

/* --------------------------------------------------------------------------
 * DELETE /api/products/:id  → suppression
 * ------------------------------------------------------------------------*/
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: "Produit supprimé" });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(404).json({ error: "Produit non trouvé" });
    console.error("❌ deleteProduct :", error);
    res.status(500).json({ error: "Erreur suppression" });
  }
};

/* --------------------------------------------------------------------------
 * GET /api/products/search  → recherche + filtres
 * ------------------------------------------------------------------------*/
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q, category, verified, eco_min, page = 1, limit = 20 } = req.query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (q) where.OR = [
      { title: { contains: q as string, mode: "insensitive" } },
      { description: { contains: q as string, mode: "insensitive" } },
      { brand: { contains: q as string, mode: "insensitive" } },
    ];
    if (category) where.category = category;
    if (verified === "true") where.verified_status = "verified";
    if (eco_min) where.eco_score = { gte: parseFloat(eco_min as string) };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: +limit,
        orderBy: [
          { verified_status: "desc" },
          { eco_score: "desc" },
          { created_at: "desc" },
        ],
        include: { partnerLinks: { include: { partner: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, pagination: { page: +page, limit: +limit, total } });
  } catch (error) {
    console.error("❌ searchProducts :", error);
    res.status(500).json({ error: "Erreur recherche" });
  }
};

/* --------------------------------------------------------------------------
 * GET /api/products/stats  → statistiques rapides
 * ------------------------------------------------------------------------*/
export const getProductStats = async (req: Request, res: Response) => {
  try {
    const [total, verified, avg, groups] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { verified_status: "verified" } }),
      prisma.product.aggregate({ _avg: { eco_score: true } }),
      prisma.product.groupBy({
        by: ["category"],
        _count: { category: true },
        take: 5,
        orderBy: { _count: { category: "desc" } },
      }),
    ]);

    res.json({
      total,
      verified,
      verification_rate: total ? Math.round((verified / total) * 100) : 0,
      average_eco_score: avg._avg.eco_score ?? 0,
      top_categories: groups.map((g) => ({ category: g.category, count: g._count.category })),
    });
  } catch (error) {
    console.error("❌ getProductStats :", error);
    res.status(500).json({ error: "Erreur statistiques" });
  }
};