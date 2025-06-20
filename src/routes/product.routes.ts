import { Router } from "express";
import {
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/product.controller";
import { getSimilarProducts } from "../controllers/similar.controller";

const router = Router();

// ✅ Route globale
router.get("/products", getProduct);

// ✅ Création produit
router.post("/products", createProduct);

// ✅ Mise à jour
router.put("/products/:id", updateProduct);

// ✅ Suppression
router.delete("/products/:id", deleteProduct);

// ✅ ⚠️ Placer cette route AVANT /products/:slug
router.get("/products/:id/similar", getSimilarProducts);

// ✅ Dernière : pour éviter qu’elle « bloque » les autres
router.get("/products/:slug", getProduct);

export default router;

