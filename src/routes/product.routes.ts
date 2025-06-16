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

export default router;
