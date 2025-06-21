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

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: Liste tous les produits
 *     description: Récupère la liste complète des produits avec leur eco_score
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Nombre maximum de produits à retourner
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Nombre de produits à ignorer (pagination)
 *     responses:
 *       200:
 *         description: Liste des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Erreur serveur
 */
router.get("/products", getAllProducts);

/**
 * @openapi
 * /api/products/search:
 *   get:
 *     summary: Recherche et filtre les produits
 *     description: Recherche dans les produits avec filtres avancés
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Terme de recherche
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtre par catégorie
 *       - in: query
 *         name: min_score
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Score écologique minimum
 *       - in: query
 *         name: max_score
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Score écologique maximum
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filtre par marque
 *       - in: query
 *         name: verified_only
 *         schema:
 *           type: boolean
 *         description: Afficher uniquement les produits vérifiés
 *     responses:
 *       200:
 *         description: Résultats de recherche
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 count:
 *                   type: integer
 *                 filters:
 *                   type: object
 */
router.get("/products/search", searchProducts);

/**
 * @openapi
 * /api/products/stats:
 *   get:
 *     summary: Statistiques des produits
 *     description: Récupère les statistiques globales des produits
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Statistiques des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_products:
 *                   type: integer
 *                   description: Nombre total de produits
 *                 average_eco_score:
 *                   type: number
 *                   description: Score écologique moyen
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 top_products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get("/products/stats", getProductStats);

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Créer un nouveau produit
 *     description: Ajoute un produit avec calcul automatique de l'eco_score via IA
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Produit créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 */
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

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     summary: Mettre à jour un produit
 *     description: Met à jour les informations d'un produit existant
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID unique du produit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProductRequest'
 *     responses:
 *       200:
 *         description: Produit mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Produit non trouvé
 */
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

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     summary: Supprimer un produit
 *     description: Supprime définitivement un produit
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID unique du produit
 *     responses:
 *       200:
 *         description: Produit supprimé
 *       404:
 *         description: Produit non trouvé
 */
router.delete("/products/:id", deleteProduct);

/**
 * @openapi
 * /api/products/{id}/similar:
 *   get:
 *     summary: Produits similaires
 *     description: Récupère des produits similaires basés sur la catégorie et les tags
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du produit de référence
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Nombre de suggestions à retourner
 *     responses:
 *       200:
 *         description: Liste des produits similaires
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit non trouvé
 */
router.get("/products/:id/similar", getSimilarProducts);

/**
 * @openapi
 * /api/products/{slug}:
 *   get:
 *     summary: Récupérer un produit par slug
 *     description: Récupère les détails d'un produit via son slug unique
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug unique du produit (ex. "savon-bio-karite")
 *     responses:
 *       200:
 *         description: Détails du produit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit non trouvé
 */
router.get("/products/:slug", getProductBySlug);

export default router;