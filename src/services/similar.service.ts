import { prisma } from "../lib/prisma";
import deepSeekClient from "../lib/deepseek";

export async function searchSimilarProducts(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Produit introuvable");

  // ⚠️ ici on simule avec fallback IA
  const similar = await deepSeekClient.getSimilar(product);

  return similar.map((item: any) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    image_url: item.image_url ?? null,
    eco_score: item.eco_score ?? 0,
  }));
}
