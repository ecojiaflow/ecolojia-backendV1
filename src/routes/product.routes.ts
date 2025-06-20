// ✅ FICHIER COMPLET : src/routes/product.routes.ts

import { Router } from "express";
import {
  getAllProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductStats
} from "../controllers/product.controller";
import { getSimilarProducts } from "../controllers/similar.controller";

const router = Router();

// ✅ Liste accueil complète
router.get("/products", getAllProducts);

// ✅ Recherche + filtres
router.get("/products/search", searchProducts);

// ✅ Statistiques rapides
router.get("/products/stats", getProductStats);

// ✅ Création produit
router.post("/products", createProduct);

// ✅ Mise à jour
router.put("/products/:id", updateProduct);

// ✅ Suppression
router.delete("/products/:id", deleteProduct);

// ✅ Suggestions similaires ➜ doit être AVANT /:slug
router.get("/products/:id/similar", getSimilarProducts);

// ✅ Dernière route ➜ résolution par slug flexible
router.get("/products/:slug", getProductBySlug);

export default router;
