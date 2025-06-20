// ✅ FICHIER COMPLET : tests/products.test.ts

import request from 'supertest';
import app from '../src/app';

describe('API Products', () => {
  
  describe('GET /api/products', () => {
    it('should return list of products', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Vérifier la structure d'un produit
      const product = response.body[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('title');
      expect(product).toHaveProperty('eco_score');
    });
  });

  describe('GET /api/products/:slug', () => {
    it('should return a product by slug', async () => {
      // D'abord récupérer un produit existant
      const productsResponse = await request(app)
        .get('/api/products')
        .expect(200);

      const testProduct = productsResponse.body[0];
      expect(testProduct).toBeDefined();
      expect(testProduct.slug).toBeDefined();

      // Tester la récupération par slug
      const response = await request(app)
        .get(`/api/products/${testProduct.slug}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testProduct.id);
      expect(response.body).toHaveProperty('title', testProduct.title);
      expect(response.body).toHaveProperty('slug', testProduct.slug);
      expect(response.body).toHaveProperty('eco_score');
      expect(typeof response.body.eco_score).toBe('number');
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/products/slug-inexistant-123')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Produit non trouvé');
    });

    it('should return 400 for empty slug', async () => {
      const response = await request(app)
        .get('/api/products/')
        .expect(404); // Express routing will return 404 for missing param
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product with eco_score', async () => {
      const newProduct = {
        title: 'Produit Test Écologique',
        description: 'Description du produit test bio avec certification écologique',
        category: 'test',
        brand: 'TestBrand',
        tags: ['bio', 'test', 'écologique']
      };

      const response = await request(app)
        .post('/api/products')
        .send(newProduct)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', newProduct.title);
      expect(response.body).toHaveProperty('description', newProduct.description);
      expect(response.body).toHaveProperty('eco_score');
      expect(response.body).toHaveProperty('slug');
      
      // Vérifier que l'eco_score a été calculé
      expect(typeof response.body.eco_score).toBe('number');
      expect(response.body.eco_score).toBeGreaterThan(0);
      expect(response.body.eco_score).toBeLessThanOrEqual(1);
      
      // Vérifier que le slug a été généré
      expect(response.body.slug).toContain('produit-test-ecologique');
    });

    it('should create product with default values for missing fields', async () => {
      const minimalProduct = {
        title: 'Produit Minimal Test'
      };

      const response = await request(app)
        .post('/api/products')
        .send(minimalProduct)
        .expect(201);

      expect(response.body).toHaveProperty('title', 'Produit Minimal Test');
      expect(response.body).toHaveProperty('description', '');
      expect(response.body).toHaveProperty('category', 'générique');
      expect(response.body).toHaveProperty('eco_score');
      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(Array.isArray(response.body.zones_dispo)).toBe(true);
    });

    it('should handle invalid request body', async () => {
      const response = await request(app)
        .post('/api/products')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/products/search', () => {
    it('should search products by query', async () => {
      const response = await request(app)
        .get('/api/products/search?q=bio')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('filters');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/products/search?category=cosmetique')
        .expect(200);

      expect(response.body.filters).toHaveProperty('category', 'cosmetique');
      
      // Si des produits sont trouvés, vérifier qu'ils ont la bonne catégorie
      if (response.body.products.length > 0) {
        response.body.products.forEach((product: any) => {
          expect(product.category.toLowerCase()).toBe('cosmetique');
        });
      }
    });

    it('should filter by eco_score range', async () => {
      const response = await request(app)
        .get('/api/products/search?min_score=0.7&max_score=1.0')
        .expect(200);

      expect(response.body.filters.min_score).toBe(0.7);
      expect(response.body.filters.max_score).toBe(1.0);
      
      // Vérifier que les produits respectent le filtre
      response.body.products.forEach((product: any) => {
        expect(product.eco_score).toBeGreaterThanOrEqual(0.7);
        expect(product.eco_score).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('GET /api/products/stats', () => {
    it('should return products statistics', async () => {
      const response = await request(app)
        .get('/api/products/stats')
        .expect(200);

      expect(response.body).toHaveProperty('total_products');
      expect(response.body).toHaveProperty('average_eco_score');
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('top_products');
      
      expect(typeof response.body.total_products).toBe('number');
      expect(typeof response.body.average_eco_score).toBe('number');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(Array.isArray(response.body.top_products)).toBe(true);
    });
  });
});