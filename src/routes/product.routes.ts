import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { recalculateEcoFields } from "../services/eco-score.service";
import { getSimilarProducts } from "../controllers/similar.controller"; // ✅ ajout

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/products
 */
router.get("/products", async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

/**
 * GET /api/products/search
 */
router.get("/products/search", async (_req: Request, res: Response) => {
  // TODO: Ajouter filtres, pagination
  const products = await prisma.product.findMany();
  res.json(products);
});

/**
 * GET /api/products/stats
 */
router.get("/products/stats", async (_req: Request, res: Response) => {
  const count = await prisma.product.count();
  const avg = await prisma.product.aggregate({ _avg: { eco_score: true } });
  res.json({ count, average_score: avg._avg.eco_score });
});

/**
 * GET /api/products/:slug
 */
router.get("/products/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug;
  const product = await prisma.product.findFirst({ where: { slug } });

  if (!product) {
    return res.status(404).json({ error: "Produit non trouvé" });
  }

  res.json(product);
});

/**
 * GET /api/products/:id/similar
 */
router.get("/products/:id/similar", getSimilarProducts); // ✅ nouvelle route IA

/**
 * POST /api/products
 */
router.post("/products", async (req: Request, res: Response) => {
  try {
    const { title, description, brand, category, tags = [], ...rest } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Titre et description requis" });
    }

    const ecoFields = await recalculateEcoFields({
      id: "",
      title,
      description,
      brand,
      category,
      tags,
      affiliate_url: null,
      ai_confidence: 0,
      confidence_pct: 0,
      confidence_color: "",
      eco_score: 0,
      verified_status: "pending",
      expiry_date: null,
      enriched_at: new Date(),
      slug: "",
      image_url: null,
      created_at: new Date(),
      updated_at: new Date(),
      zones_dispo: [],
    });

    const enriched_at = new Date();

    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const product = await prisma.product.create({
      data: {
        title,
        slug,
        description,
        brand,
        category,
        tags,
        enriched_at,
        ...ecoFields,
        ...rest,
      },
    });

    res.status(201).json({
      message: "Produit créé avec succès",
      data: {
        ...product,
        eco_score_percentage: Math.round(Number(product.eco_score) * 100),
      },
    });
  } catch (error) {
    console.error("❌ Erreur création produit:", error);
    res.status(500).json({
      error: "Erreur lors de la création du produit",
      message: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * PUT /api/products/:id
 */
router.put("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    const ecoFields = await recalculateEcoFields({ ...existing, ...data });

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...ecoFields,
        enriched_at: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("❌ Erreur mise à jour produit:", error);
    res.status(500).json({ error: "Erreur mise à jour", message: String(error) });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur suppression", message: String(error) });
  }
});

export default router;

