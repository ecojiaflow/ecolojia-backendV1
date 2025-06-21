import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/**
 * Convertit les décimaux Prisma en `number`
 */
function sanitizeProduct(product: any) {
  return {
    ...product,
    eco_score: product.eco_score ? Number(product.eco_score) : null,
    ai_confidence: product.ai_confidence ? Number(product.ai_confidence) : null
  };
}

export const getAllProducts = async (req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    orderBy: { updated_at: "desc" },
    take: 50
  });

  const sanitized = products.map(sanitizeProduct);
  res.json(sanitized);
};

export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const product = await prisma.product.findUnique({
    where: { slug }
  });

  if (!product) {
    return res.status(404).json({ error: "Produit non trouvé" });
  }

  res.json(sanitizeProduct(product));
};

export const createProduct = async (req: Request, res: Response) => {
  const data = req.body;

  const product = await prisma.product.create({
    data
  });

  res.status(201).json(sanitizeProduct(product));
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const product = await prisma.product.update({
    where: { id },
    data
  });

  res.json(sanitizeProduct(product));
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.product.delete({
    where: { id }
  });

  res.status(204).send();
};

export const searchProducts = async (req: Request, res: Response) => {
  const {
    q = "",
    category = "",
    min_score = "0",
    max_score = "1"
  } = req.query as Record<string, string>;

  const products = await prisma.product.findMany({
    where: {
      title: { contains: q, mode: "insensitive" },
      category: category || undefined,
      eco_score: {
        gte: parseFloat(min_score),
        lte: parseFloat(max_score)
      }
    },
    orderBy: { updated_at: "desc" },
    take: 50
  });

  const sanitized = products.map(sanitizeProduct);

  res.json({
    products: sanitized,
    count: sanitized.length,
    filters: {
      q,
      category,
      min_score: parseFloat(min_score),
      max_score: parseFloat(max_score)
    }
  });
};

export const getProductStats = async (req: Request, res: Response) => {
  const total = await prisma.product.count();

  const average = await prisma.product.aggregate({
    _avg: {
      eco_score: true
    }
  });

  const categories = await prisma.product.groupBy({
    by: ["category"],
    _count: { category: true },
    orderBy: { _count: { category: "desc" } }
  });

  const top = await prisma.product.findMany({
    orderBy: { eco_score: "desc" },
    take: 5
  });

  res.json({
    total_products: total,
    average_eco_score: average._avg.eco_score ? Number(average._avg.eco_score) : null,
    categories,
    top_products: top.map(sanitizeProduct)
  });
};
