import { Router } from "express";
import {
  getAllProducts,
  getProductBySlug,
  deleteProduct,
  searchProducts,
  getProductStats,
} from "../controllers/product.controller";
import { getSimilarProducts } from "../controllers/similar.controller";
import { createProductSchema, updateProductSchema } from "../validators/product.schema";
import { createProduct, updateProduct } from "../services/product.service";
import { Prisma, VerifiedStatus } from "@prisma/client";

const router = Router();

// ✅ Liste accueil complète
router.get("/products", getAllProducts);

// ✅ Recherche + filtres
router.get("/products/search", searchProducts);

// ✅ Statistiques rapides
router.get("/products/stats", getProductStats);

// ✅ Création produit
router.post("/products", async (req, res) => {
  try {
    const data = createProductSchema.parse(req.body);

    const parsedData: Prisma.ProductCreateInput = {
      title: data.title,
      slug: data.slug,
      description: data.description ?? '',
      brand: data.brand ?? null,
      category: data.category ?? 'générique',
      tags: data.tags ?? [],
      images: data.images ?? [],
      zones_dispo: data.zones_dispo ?? [],
      prices: data.prices ?? {},
      affiliate_url: data.affiliate_url ?? null,
      eco_score: data.eco_score ? new Prisma.Decimal(data.eco_score) : undefined,
      ai_confidence: data.ai_confidence ? new Prisma.Decimal(data.ai_confidence) : undefined,
      confidence_pct: data.confidence_pct ?? null,
      confidence_color: data.confidence_color ?? null,
      verified_status: data.verified_status as VerifiedStatus ?? 'pending',
      resume_fr: data.resume_fr ?? '',
      resume_en: data.resume_en ?? '',
      enriched_at: data.enriched_at ? new Date(data.enriched_at) : undefined,
    };

    const product = await createProduct(parsedData);
    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({
      error: "Validation error",
      details: err.errors ?? err.message,
    });
  }
});

// ✅ Mise à jour produit
router.put("/products/:id", async (req, res) => {
  try {
    const data = updateProductSchema.parse(req.body);

    const parsedData: Prisma.ProductUpdateInput = {
      title: data.title,
      slug: data.slug,
      description: data.description,
      brand: data.brand,
      category: data.category,
      tags: data.tags,
      images: data.images,
      zones_dispo: data.zones_dispo,
      prices: data.prices,
      affiliate_url: data.affiliate_url,
      eco_score: data.eco_score ? new Prisma.Decimal(data.eco_score) : undefined,
      ai_confidence: data.ai_confidence ? new Prisma.Decimal(data.ai_confidence) : undefined,
      confidence_pct: data.confidence_pct,
      confidence_color: data.confidence_color,
      verified_status: data.verified_status as VerifiedStatus,
      resume_fr: data.resume_fr,
      resume_en: data.resume_en,
      enriched_at: data.enriched_at ? new Date(data.enriched_at) : undefined,
    };

    const { id } = req.params;
    const product = await updateProduct(id, parsedData);
    res.json(product);
  } catch (err: any) {
    res.status(400).json({
      error: "Validation error",
      details: err.errors ?? err.message,
    });
  }
});

// ✅ Suppression
router.delete("/products/:id", deleteProduct);

// ✅ Suggestions similaires ➜ doit être AVANT /:slug
router.get("/products/:id/similar", getSimilarProducts);

// ✅ Dernière route ➜ résolution par slug flexible
router.get("/products/:slug", getProductBySlug);

export default router;

