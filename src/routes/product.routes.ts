import { Router, Request, Response } from 'express';
import * as ProductController from '../controllers/product.controller';

const router = Router();

/**
 * GET /api/products
 * Liste tous les produits
 */
router.get('/products', (req: Request, res: Response) => {
  ProductController.getAllProducts(req, res);
});

/**
 * GET /api/products/:slug
 * Retourne un produit par son slug
 */
router.get('/products/:slug', (req: Request, res: Response) => {
  ProductController.getProductBySlug(req, res);
});

/**
 * POST /api/products
 * Crée un nouveau produit
 */
router.post('/products', (req: Request, res: Response) => {
  ProductController.createProduct(req, res);
});

/**
 * PUT /api/products/:id
 * Met à jour un produit
 */
router.put('/products/:id', (req: Request, res: Response) => {
  ProductController.updateProduct(req, res);
});

/**
 * DELETE /api/products/:id
 * Supprime un produit
 */
router.delete('/products/:id', (req: Request, res: Response) => {
  ProductController.deleteProduct(req, res);
});

export default router;