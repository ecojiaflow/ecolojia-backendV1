// tests/setup.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    }
  }
});

// Nettoyer la base avant chaque test
beforeEach(async () => {
  try {
    // Supprimer les données de test (utiliser les vrais champs)
    await prisma.partnerLink.deleteMany({
      where: { 
        OR: [
          { url: { contains: 'test-partner' } },
          { tracking_id: { startsWith: 'TEST_' } }
        ]
      }
    });
    
    await prisma.partner.deleteMany({
      where: { name: { startsWith: 'Test Partner' } }
    });
    
    await prisma.product.deleteMany({
      where: { title: { startsWith: 'Test Product' } }
    });
    
  } catch (error) {
    // Ignorer les erreurs de cleanup - normal en tests
    if (!error.message.includes('Unknown argument')) {
      console.log('Cleanup info:', error.message.substring(0, 50));
    }
  }
});

// Fermer la connexion après tous les tests
afterAll(async () => {
  await prisma.$disconnect();
});

global.prisma = prisma;