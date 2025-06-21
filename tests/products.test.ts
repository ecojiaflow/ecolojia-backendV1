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

      const product = response.body[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('title');
      expect(product).toHaveProperty('eco_score');
    });
  });

  describe('GET /api/products/:slug', () => {
    it('should return a product by slug', async () => {
      const productsResponse = await request(app)
        .get('/api/products')
        .expect(200);

      const testProduct = productsResponse.body[0];
      expect(testProduct).toBeDefined();
      expect(testProduct.slug).toBeDefined();

      const response = await request(app)
        .get(`/api/products/${testProduct.slug}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testProduct.id);
      expect(response.body).toHaveProperty('title', testProduct.title);
      expect(response.body).toHaveProperty('slug', testProduct.slug);
      expect(response.body).toHaveProperty('eco_score');

      // ✅ Cast Prisma.Decimal to number
      const ecoScore = Number(response.body.eco_score);
      expect(typeof ecoScore).toBe('number');
      expect(ecoScore).toBeGreaterThanOrEqual(0);
      expect(ecoScore).toBeLessThanOrEqual(1);
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/products/slug-inexistant-123')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product with eco_score', async () => {
      const newProduct = {
        title: "Produit Test Écologique",
        slug: "produit-test-ecologique-" + Date.now(), // 🔁 éviter les doublons
        description: "Produit certifié éco.",
        category: "test",
        brand: "TestBrand",
        tags: ["bio", "test"],
        verified_status: "manual_review"
      };

      const response = await request(app)
        .post('/api/products')
        .send(newProduct)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', newProduct.title);
      expect(response.body).toHaveProperty('eco_score');

      const ecoScore = Number(response.body.eco_score);
      expect(typeof ecoScore).toBe('number');
      expect(ecoScore).toBeGreaterThan(0);
      expect(ecoScore).toBeLessThanOrEqual(1);
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
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/products/search?category=cosmetique')
        .expect(200);

      expect(response.body.filters).toHaveProperty('category', 'cosmetique');
    });

    it('should filter by eco_score range', async () => {
      const response = await request(app)
        .get('/api/products/search?min_score=0.7&max_score=1.0')
        .expect(200);

      response.body.products.forEach((product: any) => {
        const score = Number(product.eco_score);
        expect(score).toBeGreaterThanOrEqual(0.7);
        expect(score).toBeLessThanOrEqual(1.0);
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
    });
  });
});
