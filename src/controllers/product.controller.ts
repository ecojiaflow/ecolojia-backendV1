import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/products
 * Retourne tous les produits pour la page d'accueil
 */
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        created_at: 'desc',
      },
      include: {
        partnerLinks: {
          include: {
            partner: true, // ✅ inclure partenaire dans liste d'accueil aussi
          },
        },
      },
    });

    res.status(200).json(products);
  } catch (error) {
    console.error('❌ Erreur récupération produits :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * GET /api/products/:slug
 * Retourne un produit par son slug (ex: savon-alep-artisanal)
 */
export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: {
        slug, // ✅ utilise directement le champ slug (doit être @unique dans Prisma)
      },
      include: {
        partnerLinks: {
          include: {
            partner: true, // ✅ inclure partenaire dans la fiche produit
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('❌ Erreur récupération produit par slug :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
